type ArgumentsBase = {
    target: string,
}

function isArgumentsBase($: any): $ is ArgumentsBase {
    return typeof $ === 'object'
        && $ !== null
        && typeof $.target === 'string';
}

export type ArgumentsWithSource = ArgumentsBase & {
    source: string,
}

export function isArgumentsWithSource($: any): $ is ArgumentsWithSource {
    return isArgumentsBase($)
        && typeof ($ as {source?: string}).source === 'string';
}

export type ArgumentsWithConfig = ArgumentsBase & {
    config: string,
}

export function isArgumentsWithConfig($: any): $ is ArgumentsWithConfig {
    return isArgumentsBase($)
        && typeof ($ as {config?: string}).config === 'string';
}