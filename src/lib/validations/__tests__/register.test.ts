import { describe, it, expect } from 'vitest'
import {
  step1Schema,
  step2AlumniSchema,
  step2S4Schema,
  step2StudentSchema,
  step3Schema,
  eleveSubTypeSchema,
} from '../register'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174000'

describe('register — XSS_BLOCKLIST (indirect via textField)', () => {
  const baseStep1 = {
    last_name: 'Valide',
    date_of_birth: '2000-01-15',
    nationality: ['Haïtienne'],
    country: 'Haïti',
    status_type: 'ancienne' as const,
  }

  const xssPayloads = [
    '<script>',
    '</script>',
    'Bob<img>',
    'javascript:alert(1)',
    'javascript : alert(1)',
    'data:text/html,<script>',
    'vbscript:msgbox',
    'onclick=alert(1)',
    'onerror = x',
    '{injection}',
    '`template`',
    '\\u0041evil',
    '\\x41evil',
    'JAVASCRIPT:x',
  ]

  it.each(xssPayloads)('rejette le payload XSS dans first_name: %s', (payload) => {
    const result = step1Schema.safeParse({ ...baseStep1, first_name: payload })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('first_name'))).toBe(true)
    }
  })

  it('accepte les accents, apostrophes, tirets dans les noms', () => {
    const result = step1Schema.safeParse({
      ...baseStep1,
      first_name: "Marie-Anne Joséphine O'Brien",
    })
    expect(result.success).toBe(true)
  })

  it('accepte les espaces et caractères unicode normaux', () => {
    const result = step1Schema.safeParse({ ...baseStep1, first_name: 'Élodie 黃' })
    expect(result.success).toBe(true)
  })
})

describe('register — step1Schema (Profil de base)', () => {
  const validStep1 = {
    first_name: 'Marie',
    last_name: 'Dupont',
    date_of_birth: '2000-01-15',
    nationality: ['Haïtienne'],
    country: 'Haïti',
    status_type: 'ancienne' as const,
  }

  it('valide un payload correct', () => {
    expect(step1Schema.safeParse(validStep1).success).toBe(true)
  })

  it('rejette first_name vide', () => {
    const r = step1Schema.safeParse({ ...validStep1, first_name: '' })
    expect(r.success).toBe(false)
  })

  it('rejette first_name > 100 caractères', () => {
    const r = step1Schema.safeParse({ ...validStep1, first_name: 'a'.repeat(101) })
    expect(r.success).toBe(false)
  })

  it('accepte first_name à exactement 100 caractères', () => {
    const r = step1Schema.safeParse({ ...validStep1, first_name: 'a'.repeat(100) })
    expect(r.success).toBe(true)
  })

  it('rejette date_of_birth vide', () => {
    const r = step1Schema.safeParse({ ...validStep1, date_of_birth: '' })
    expect(r.success).toBe(false)
  })

  it('rejette nationality vide', () => {
    const r = step1Schema.safeParse({ ...validStep1, nationality: [] })
    expect(r.success).toBe(false)
  })

  it('accepte multi-nationalité (1-5)', () => {
    const r = step1Schema.safeParse({
      ...validStep1,
      nationality: ['Haïtienne', 'Canadienne', 'Française'],
    })
    expect(r.success).toBe(true)
  })

  it('rejette plus de 5 nationalités', () => {
    const r = step1Schema.safeParse({
      ...validStep1,
      nationality: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    expect(r.success).toBe(false)
  })

  it('rejette XSS dans un élément de nationality', () => {
    const r = step1Schema.safeParse({
      ...validStep1,
      nationality: ['Haïtienne', '<script>'],
    })
    expect(r.success).toBe(false)
  })

  it('rejette status_type hors enum', () => {
    const r = step1Schema.safeParse({ ...validStep1, status_type: 'autre' })
    expect(r.success).toBe(false)
  })

  it.each(['ancienne', 'eleve_actuelle'] as const)(
    'accepte status_type = %s',
    (status) => {
      const r = step1Schema.safeParse({ ...validStep1, status_type: status })
      expect(r.success).toBe(true)
    }
  )
})

describe('register — step2AlumniSchema (Branche Alumni)', () => {
  const validAlumni = {
    promotion_name: 'Promo 2010',
    is_new_promo: false,
    promo_start_date: 2006,
    filiere: 'SVT' as const,
    activities: [VALID_UUID],
    institution_type: 'university' as const,
    institution_name: 'Université Quisqueya',
    study_field: 'Médecine',
    degree_level: 'Master',
    start_year: 2010,
    end_year: 2015,
    job_title: 'Médecin',
    job_company: 'Hôpital Bernard Mevs',
  }

  it('valide un payload correct complet', () => {
    expect(step2AlumniSchema.safeParse(validAlumni).success).toBe(true)
  })

  it.each(['SVT', 'SES', 'SMP', 'Section A', 'Section B', 'Section C', 'Section D'])(
    'accepte la filière %s',
    (filiere) => {
      const r = step2AlumniSchema.safeParse({ ...validAlumni, filiere })
      expect(r.success).toBe(true)
    }
  )

  it('rejette une filière hors enum', () => {
    const r = step2AlumniSchema.safeParse({ ...validAlumni, filiere: 'SVT_OLD' })
    expect(r.success).toBe(false)
  })

  it.each(['university', 'professional_school', 'other'])(
    'accepte institution_type = %s',
    (t) => {
      const r = step2AlumniSchema.safeParse({ ...validAlumni, institution_type: t })
      expect(r.success).toBe(true)
    }
  )

  it('accepte degree_level vide (optionnel → traité comme undefined)', () => {
    const r = step2AlumniSchema.safeParse({ ...validAlumni, degree_level: '' })
    expect(r.success).toBe(true)
  })

  it('accepte start_year vide (optionnel)', () => {
    const r = step2AlumniSchema.safeParse({ ...validAlumni, start_year: '' })
    expect(r.success).toBe(true)
  })

  it('rejette promo_start_date < 1980', () => {
    const r = step2AlumniSchema.safeParse({ ...validAlumni, promo_start_date: 1979 })
    expect(r.success).toBe(false)
  })

  it('accepte job_company vide (optionnel)', () => {
    const r = step2AlumniSchema.safeParse({ ...validAlumni, job_company: '' })
    expect(r.success).toBe(true)
  })

  it('rejette XSS dans institution_name', () => {
    const r = step2AlumniSchema.safeParse({
      ...validAlumni,
      institution_name: 'École<script>',
    })
    expect(r.success).toBe(false)
  })

  it('activities accepte un tableau vide (multi-select optionnel)', () => {
    const r = step2AlumniSchema.safeParse({ ...validAlumni, activities: [] })
    expect(r.success).toBe(true)
  })

  it('rejette un UUID invalide dans activities', () => {
    const r = step2AlumniSchema.safeParse({
      ...validAlumni,
      activities: ['not-a-uuid'],
    })
    expect(r.success).toBe(false)
  })
})

describe('register — step2S4Schema (Branche S4 finissante)', () => {
  const validS4 = {
    promotion_name: 'Promo 2026',
    promo_start_date: 2022,
    filiere: 'SMP' as const,
    activities: [VALID_UUID],
    desired_study_fields: ['Médecine', 'Ingénierie'],
  }

  it('valide un payload correct', () => {
    expect(step2S4Schema.safeParse(validS4).success).toBe(true)
  })

  it('rejette desired_study_fields vide', () => {
    const r = step2S4Schema.safeParse({ ...validS4, desired_study_fields: [] })
    expect(r.success).toBe(false)
  })

  it('accepte exactement 3 desired_study_fields', () => {
    const r = step2S4Schema.safeParse({
      ...validS4,
      desired_study_fields: ['A', 'B', 'C'],
    })
    expect(r.success).toBe(true)
  })

  it('rejette plus de 3 desired_study_fields', () => {
    const r = step2S4Schema.safeParse({
      ...validS4,
      desired_study_fields: ['A', 'B', 'C', 'D'],
    })
    expect(r.success).toBe(false)
  })

  it('rejette XSS dans desired_study_fields', () => {
    const r = step2S4Schema.safeParse({
      ...validS4,
      desired_study_fields: ['Médecine', '<script>'],
    })
    expect(r.success).toBe(false)
  })
})

describe('register — step2StudentSchema (Branche S1-S3)', () => {
  const validStudent = {
    class: 'S2' as const,
    enrollment_date: 2024,
    activities: [VALID_UUID, VALID_UUID_2],
    desired_study_fields: ['Droit'],
  }

  it('valide un payload correct', () => {
    expect(step2StudentSchema.safeParse(validStudent).success).toBe(true)
  })

  it.each(['S1', 'S2', 'S3'] as const)('accepte class = %s', (c) => {
    const r = step2StudentSchema.safeParse({ ...validStudent, class: c })
    expect(r.success).toBe(true)
  })

  it('rejette class hors enum (S4 n\'est pas une S1-S3)', () => {
    const r = step2StudentSchema.safeParse({ ...validStudent, class: 'S4' })
    expect(r.success).toBe(false)
  })

  it('rejette enrollment_date > year+10', () => {
    const farFuture = new Date().getFullYear() + 11
    const r = step2StudentSchema.safeParse({
      ...validStudent,
      enrollment_date: farFuture,
    })
    expect(r.success).toBe(false)
  })
})

describe('register — eleveSubTypeSchema', () => {
  it.each(['s4', 's1_s3'] as const)('accepte sub_type = %s', (s) => {
    const r = eleveSubTypeSchema.safeParse({ sub_type: s })
    expect(r.success).toBe(true)
  })

  it('rejette une valeur hors enum', () => {
    const r = eleveSubTypeSchema.safeParse({ sub_type: 'alumni' })
    expect(r.success).toBe(false)
  })
})

describe('register — step3Schema (Création compte)', () => {
  const validStep3 = {
    username: 'marie_d',
    email: 'marie@example.com',
    password: 'Password123',
    confirm_password: 'Password123',
    accept_terms: true,
  }

  it('valide un payload correct', () => {
    expect(step3Schema.safeParse(validStep3).success).toBe(true)
  })

  describe('username', () => {
    it('rejette < 3 caractères', () => {
      const r = step3Schema.safeParse({ ...validStep3, username: 'ab' })
      expect(r.success).toBe(false)
    })

    it('accepte 3 caractères pile', () => {
      const r = step3Schema.safeParse({ ...validStep3, username: 'abc' })
      expect(r.success).toBe(true)
    })

    it('accepte 20 caractères pile', () => {
      const r = step3Schema.safeParse({ ...validStep3, username: 'a'.repeat(20) })
      expect(r.success).toBe(true)
    })

    it('rejette > 20 caractères', () => {
      const r = step3Schema.safeParse({ ...validStep3, username: 'a'.repeat(21) })
      expect(r.success).toBe(false)
    })

    it.each(['marie.d', 'marie-d', 'marie d', 'marie@d', '<bob>'])(
      'rejette caractères non-alphanumériques: %s',
      (u) => {
        const r = step3Schema.safeParse({ ...validStep3, username: u })
        expect(r.success).toBe(false)
      }
    )

    it('accepte underscore et chiffres', () => {
      const r = step3Schema.safeParse({ ...validStep3, username: 'marie_2025' })
      expect(r.success).toBe(true)
    })
  })

  describe('email', () => {
    it.each(['plain', '@bad.com', 'no@', 'a@b', 'a b@c.com'])(
      'rejette email invalide: %s',
      (e) => {
        const r = step3Schema.safeParse({ ...validStep3, email: e })
        expect(r.success).toBe(false)
      }
    )

    it('accepte un email valide', () => {
      const r = step3Schema.safeParse({ ...validStep3, email: 'marie@cma.ht' })
      expect(r.success).toBe(true)
    })
  })

  describe('password', () => {
    it('rejette < 8 caractères', () => {
      const r = step3Schema.safeParse({
        ...validStep3,
        password: 'Pa1',
        confirm_password: 'Pa1',
      })
      expect(r.success).toBe(false)
    })

    it('rejette sans majuscule', () => {
      const r = step3Schema.safeParse({
        ...validStep3,
        password: 'password123',
        confirm_password: 'password123',
      })
      expect(r.success).toBe(false)
    })

    it('rejette sans minuscule', () => {
      const r = step3Schema.safeParse({
        ...validStep3,
        password: 'PASSWORD123',
        confirm_password: 'PASSWORD123',
      })
      expect(r.success).toBe(false)
    })

    it('rejette sans chiffre', () => {
      const r = step3Schema.safeParse({
        ...validStep3,
        password: 'Password',
        confirm_password: 'Password',
      })
      expect(r.success).toBe(false)
    })

    it('rejette si password ≠ confirm_password', () => {
      const r = step3Schema.safeParse({
        ...validStep3,
        confirm_password: 'Different1',
      })
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues.some((i) => i.path.includes('confirm_password'))).toBe(
          true
        )
      }
    })
  })

  describe('accept_terms', () => {
    it('rejette accept_terms = false', () => {
      const r = step3Schema.safeParse({ ...validStep3, accept_terms: false })
      expect(r.success).toBe(false)
    })

    it('exige true exact (truthy non accepté)', () => {
      // Zod boolean n'accepte que boolean strict
      const r = step3Schema.safeParse({ ...validStep3, accept_terms: 'true' })
      expect(r.success).toBe(false)
    })
  })
})
