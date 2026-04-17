import { describe, it, expect } from 'vitest'
import {
  updateIdentitySchema,
  updateBioSchema,
  addEducationSchema,
  addProfessionSchema,
  updateDesiredFieldsSchema,
  deactivateAccountSchema,
  updateThemeSchema,
  updateActivitiesSchema,
  updateNotificationPrefsSchema,
} from '../profile'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('profile — updateIdentitySchema', () => {
  const valid = {
    username: 'marie_d',
    first_name: 'Marie',
    last_name: 'Dupont',
  }

  it('valide un payload correct', () => {
    expect(updateIdentitySchema.safeParse(valid).success).toBe(true)
  })

  it('rejette username < 3 chars', () => {
    const r = updateIdentitySchema.safeParse({ ...valid, username: 'ab' })
    expect(r.success).toBe(false)
  })

  it('rejette username > 20 chars', () => {
    const r = updateIdentitySchema.safeParse({ ...valid, username: 'a'.repeat(21) })
    expect(r.success).toBe(false)
  })

  it('rejette username avec caractères non alphanumériques', () => {
    const r = updateIdentitySchema.safeParse({ ...valid, username: 'marie-d' })
    expect(r.success).toBe(false)
  })

  it('accepte username avec underscore', () => {
    const r = updateIdentitySchema.safeParse({ ...valid, username: 'marie_d_2025' })
    expect(r.success).toBe(true)
  })

  it.each(['<script>', 'javascript:x', 'Bob`inj`', 'onerror=x', 'onclick =foo'])(
    'rejette XSS dans first_name: %s',
    (v) => {
      const r = updateIdentitySchema.safeParse({ ...valid, first_name: v })
      expect(r.success).toBe(false)
    }
  )

  it.each(['<script>', 'javascript:x', 'Bob`inj`'])(
    'rejette XSS dans last_name: %s',
    (v) => {
      const r = updateIdentitySchema.safeParse({ ...valid, last_name: v })
      expect(r.success).toBe(false)
    }
  )

  it('accepte caractères accentués + apostrophes + tirets', () => {
    const r = updateIdentitySchema.safeParse({
      ...valid,
      first_name: "Marie-Ève",
      last_name: "O'Connor-Saint",
    })
    expect(r.success).toBe(true)
  })
})

describe('profile — updateBioSchema', () => {
  it('accepte bio vide (string empty, pas nullable forcément)', () => {
    expect(updateBioSchema.safeParse({ bio: '' }).success).toBe(true)
  })

  it('accepte bio null', () => {
    expect(updateBioSchema.safeParse({ bio: null }).success).toBe(true)
  })

  it('accepte bio de 500 chars exactement', () => {
    expect(updateBioSchema.safeParse({ bio: 'a'.repeat(500) }).success).toBe(true)
  })

  it('rejette bio > 500 chars', () => {
    expect(updateBioSchema.safeParse({ bio: 'a'.repeat(501) }).success).toBe(false)
  })
})

describe('profile — addEducationSchema', () => {
  const valid = {
    institution_type: 'university' as const,
    institution_name: 'Université Quisqueya',
    study_field: 'Informatique',
    degree_level: 'Master',
    start_year: 2015,
    end_year: 2020,
  }

  it('valide un payload complet', () => {
    expect(addEducationSchema.safeParse(valid).success).toBe(true)
  })

  it.each(['university', 'professional_school', 'other'])(
    'accepte institution_type = %s',
    (t) => {
      const r = addEducationSchema.safeParse({ ...valid, institution_type: t })
      expect(r.success).toBe(true)
    }
  )

  it('rejette institution_type hors enum', () => {
    const r = addEducationSchema.safeParse({ ...valid, institution_type: 'highschool' })
    expect(r.success).toBe(false)
  })

  it('degree_level est optionnel', () => {
    const { degree_level, ...withoutDegree } = valid
    void degree_level
    expect(addEducationSchema.safeParse(withoutDegree).success).toBe(true)
  })

  it('start_year et end_year sont optionnels', () => {
    const { start_year, end_year, ...partial } = valid
    void start_year
    void end_year
    expect(addEducationSchema.safeParse(partial).success).toBe(true)
  })

  it('rejette start_year < 1950', () => {
    const r = addEducationSchema.safeParse({ ...valid, start_year: 1949 })
    expect(r.success).toBe(false)
  })

  it('rejette start_year > 2100', () => {
    const r = addEducationSchema.safeParse({ ...valid, start_year: 2101 })
    expect(r.success).toBe(false)
  })

  it('rejette institution_name vide', () => {
    const r = addEducationSchema.safeParse({ ...valid, institution_name: '' })
    expect(r.success).toBe(false)
  })
})

describe('profile — addProfessionSchema', () => {
  it('valide avec company', () => {
    const r = addProfessionSchema.safeParse({
      title: 'Ingénieure logicielle',
      company: 'Anthropic',
      is_current: true,
    })
    expect(r.success).toBe(true)
  })

  it('company est optionnel', () => {
    const r = addProfessionSchema.safeParse({
      title: 'Freelance',
      is_current: true,
    })
    expect(r.success).toBe(true)
  })

  it('rejette title vide', () => {
    const r = addProfessionSchema.safeParse({
      title: '',
      is_current: true,
    })
    expect(r.success).toBe(false)
  })

  it('is_current est obligatoire (boolean)', () => {
    const r = addProfessionSchema.safeParse({ title: 'Dev' })
    expect(r.success).toBe(false)
  })
})

describe('profile — updateDesiredFieldsSchema', () => {
  it('accepte tableau vide', () => {
    expect(updateDesiredFieldsSchema.safeParse({ fields: [] }).success).toBe(true)
  })

  it('accepte exactement 3 fields', () => {
    expect(
      updateDesiredFieldsSchema.safeParse({ fields: ['a', 'b', 'c'] }).success
    ).toBe(true)
  })

  it('rejette > 3 fields', () => {
    expect(
      updateDesiredFieldsSchema.safeParse({ fields: ['a', 'b', 'c', 'd'] }).success
    ).toBe(false)
  })

  it('rejette field > 150 chars', () => {
    expect(
      updateDesiredFieldsSchema.safeParse({ fields: ['a'.repeat(151)] }).success
    ).toBe(false)
  })
})

describe('profile — deactivateAccountSchema', () => {
  it('accepte exactement "DÉSACTIVER"', () => {
    expect(
      deactivateAccountSchema.safeParse({ confirmation: 'DÉSACTIVER' }).success
    ).toBe(true)
  })

  it.each(['desactiver', 'DESACTIVER', 'Désactiver', 'DÉSACTIVER ', ' DÉSACTIVER'])(
    'rejette toute variation: %s',
    (v) => {
      expect(deactivateAccountSchema.safeParse({ confirmation: v }).success).toBe(false)
    }
  )
})

describe('profile — updateThemeSchema', () => {
  it.each(['light', 'dark', 'system'] as const)('accepte theme = %s', (t) => {
    expect(updateThemeSchema.safeParse({ theme: t }).success).toBe(true)
  })

  it('rejette theme hors enum', () => {
    expect(updateThemeSchema.safeParse({ theme: 'auto' }).success).toBe(false)
  })
})

describe('profile — updateActivitiesSchema', () => {
  it('accepte tableau vide', () => {
    expect(updateActivitiesSchema.safeParse({ activity_ids: [] }).success).toBe(true)
  })

  it('accepte UUIDs valides', () => {
    expect(
      updateActivitiesSchema.safeParse({ activity_ids: [VALID_UUID] }).success
    ).toBe(true)
  })

  it('rejette UUID invalide', () => {
    expect(
      updateActivitiesSchema.safeParse({ activity_ids: ['not-a-uuid'] }).success
    ).toBe(false)
  })

  it('rejette > 20 activités', () => {
    const many = Array.from({ length: 21 }, () => VALID_UUID)
    expect(updateActivitiesSchema.safeParse({ activity_ids: many }).success).toBe(false)
  })
})

describe('profile — updateNotificationPrefsSchema', () => {
  const fullPrefs = {
    dm: true,
    forum_reply: true,
    forum_comment_reply: true,
    reaction: false,
    mention: true,
    mentorship: true,
    mentorship_completed: true,
    election: true,
    new_opportunity: true,
    push_enabled: false,
  }

  it('valide toutes les prefs à la fois', () => {
    expect(updateNotificationPrefsSchema.safeParse(fullPrefs).success).toBe(true)
  })

  it('exige tous les champs (pas de partial)', () => {
    const { dm, ...partial } = fullPrefs
    void dm
    expect(updateNotificationPrefsSchema.safeParse(partial).success).toBe(false)
  })

  it('rejette valeur non-boolean', () => {
    const r = updateNotificationPrefsSchema.safeParse({
      ...fullPrefs,
      dm: 'yes',
    })
    expect(r.success).toBe(false)
  })
})
