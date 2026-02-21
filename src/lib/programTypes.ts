export const PROGRAM_TYPE_VALUES = [
    'sellos',
    'cashback',
    'multipase',
    'membresia',
    'descuento',
    'cupon',
    'regalo',
    'afiliacion'
] as const

export type ProgramType = (typeof PROGRAM_TYPE_VALUES)[number]

export function isProgramType(value: unknown): value is ProgramType {
    return typeof value === 'string' && PROGRAM_TYPE_VALUES.includes(value as ProgramType)
}
