import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Vitest setup — smoke test', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('renders a React component with jest-dom matchers', () => {
    render(<h1>CMA Connect</h1>)
    expect(
      screen.getByRole('heading', { name: /cma connect/i })
    ).toBeInTheDocument()
  })

  it('resolves @/ path alias from tsconfig', async () => {
    const mod = await import('@/lib/utils')
    expect(mod).toBeDefined()
  })

  it('mocks next/navigation without crashing', async () => {
    const { useRouter, redirect } = await import('next/navigation')
    expect(useRouter()).toHaveProperty('push')
    expect(() => redirect('/foo')).toThrow('NEXT_REDIRECT:/foo')
  })

  it('mocks next/headers with async cookies()', async () => {
    const { cookies, headers } = await import('next/headers')
    const c = await cookies()
    const h = await headers()
    expect(c).toHaveProperty('get')
    expect(h).toBeInstanceOf(Headers)
  })
})
