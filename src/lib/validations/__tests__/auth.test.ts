import { describe, it, expect } from 'vitest'
import { loginSchema, detectIdentifierType } from '../auth'

describe('auth — loginSchema', () => {
  const validLogin = {
    identifier: 'marie_d',
    password: 'whatever',
  }

  it('valide un payload minimal', () => {
    expect(loginSchema.safeParse(validLogin).success).toBe(true)
  })

  it('rejette identifier < 3 caractères', () => {
    const r = loginSchema.safeParse({ ...validLogin, identifier: 'ab' })
    expect(r.success).toBe(false)
  })

  it('rejette identifier > 200 caractères', () => {
    const r = loginSchema.safeParse({
      ...validLogin,
      identifier: 'a'.repeat(201),
    })
    expect(r.success).toBe(false)
  })

  it('rejette password vide', () => {
    const r = loginSchema.safeParse({ ...validLogin, password: '' })
    expect(r.success).toBe(false)
  })

  describe('dob (optionnel, format ISO)', () => {
    it('accepte dob absent', () => {
      expect(loginSchema.safeParse(validLogin).success).toBe(true)
    })

    it('accepte dob ISO valide', () => {
      const r = loginSchema.safeParse({ ...validLogin, dob: '2000-01-15' })
      expect(r.success).toBe(true)
    })

    it.each(['15/01/2000', '2000/01/15', '2000-1-15', '01-01-2000', 'invalid'])(
      'rejette dob format invalide: %s',
      (dob) => {
        const r = loginSchema.safeParse({ ...validLogin, dob })
        expect(r.success).toBe(false)
      }
    )
  })

  describe('otp_code (optionnel, 6 chiffres)', () => {
    it('accepte otp_code absent', () => {
      expect(loginSchema.safeParse(validLogin).success).toBe(true)
    })

    it('accepte 6 chiffres exactement', () => {
      const r = loginSchema.safeParse({ ...validLogin, otp_code: '123456' })
      expect(r.success).toBe(true)
    })

    it.each(['12345', '1234567', 'abcdef', '12345a', ''])(
      'rejette otp invalide: %s',
      (otp) => {
        const r = loginSchema.safeParse({ ...validLogin, otp_code: otp })
        expect(r.success).toBe(false)
      }
    )
  })
})

describe('auth — detectIdentifierType', () => {
  describe('email (contient @)', () => {
    it.each([
      'marie@example.com',
      'a@b.c',
      '@leading',
      'trailing@',
      'mul@tiple@at',
    ])('détecte email: %s', (v) => {
      expect(detectIdentifierType(v)).toBe('email')
    })
  })

  describe('username (alphanum + underscore)', () => {
    it.each(['marie_d', 'abc', 'user123', '_test_', 'ABC_xyz_1'])(
      'détecte username: %s',
      (v) => {
        expect(detectIdentifierType(v)).toBe('username')
      }
    )
  })

  describe('fullname (fallback — espaces ou caractères spéciaux)', () => {
    it.each([
      'Marie Dupont',
      'Marie-Anne Joséphine Dupont',
      "O'Brien",
      'Marie.Dupont',
      'Marie Dupont ',
      ' Marie',
    ])('détecte fullname: %s', (v) => {
      expect(detectIdentifierType(v)).toBe('fullname')
    })
  })

  it('priorité @ : une string avec espace ET @ → email (car `@` checké en 1er)', () => {
    expect(detectIdentifierType('marie dupont@cma.ht')).toBe('email')
  })

  it('priorité @ : "user@name" (sans point) → email', () => {
    expect(detectIdentifierType('user@name')).toBe('email')
  })

  it('chaîne vide → username (regex alphanum matches "" car * est 0+)', () => {
    // Note: /^[a-zA-Z0-9_]+$/ exige au moins 1 char.
    // Une string vide → fullname (ne contient pas @ et ne match pas la regex).
    expect(detectIdentifierType('')).toBe('fullname')
  })
})
