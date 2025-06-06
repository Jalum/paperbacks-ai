export interface AuthProvider {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

export type ProvidersResponse = Record<string, AuthProvider>