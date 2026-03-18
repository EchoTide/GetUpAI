import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Smoke Test', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should render a simple component', () => {
    const Greeting = () => <div>Hello, Vitest!</div>
    render(<Greeting />)
    expect(screen.getByText('Hello, Vitest!')).toBeInTheDocument()
  })
})
