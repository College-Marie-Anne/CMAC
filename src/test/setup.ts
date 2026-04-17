import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers()),
  draftMode: vi.fn(async () => ({
    isEnabled: false,
    enable: vi.fn(),
    disable: vi.fn(),
  })),
}))

vi.mock('server-only', () => ({}))
