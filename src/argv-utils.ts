function normalizeValue($value: string): string | number | boolean {
    if (/^(true|false)$/.test($value)) {
        return $value === 'true';
    }
    if (/^[1-9]\d*$/.test($value)) {
        return parseInt($value);
    }
    return $value;
}

function normalizeArgumentName($name: string): string {
    return $name
        .replace(/^--/, '')
        .replace(/-(\w)/g, function ($match, $letter) {
            return $letter.toUpperCase();
        })
}

export function argvToObject($argv: Array<string>): Record<string, string | number | boolean> {
    let rtn = {};
    for(let i = 0, l = $argv.length; i < l; i++) {
        if (/^--\w/.test($argv[i])) {
            if (i + 1 < l && !/^--/.test($argv[i + 1])) {
                rtn = {
                    ...rtn,
                    [normalizeArgumentName($argv[i])]: normalizeValue($argv[i + 1]),
                }
                i++;
            } else {
                rtn = {
                    ...rtn,
                    [normalizeArgumentName($argv[i])]: true,
                }

            }
        }
    }
    return rtn;
}
