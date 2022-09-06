const fs = require('fs');
const path = require('path');
const glob = require("glob");

export function convertPathForWin($path: string): string {
    return $path.replace(/\//g, '\\');
}

export function fileExists($path: string): Promise<boolean> {
    return new Promise(($resolve, $reject) => {
        fs.stat($path, ($err, $stats) => {
            if ($err) {
                $resolve(false);
            } else {
                $resolve(true);
            }
        })
    });
}

export function getFileContent($path: string, $options?: { encoding?: string; flag?: string }): Promise<string | Buffer> {
    return new Promise(($resolve, $reject) => {
        const handler = ($err, $data) => {
            if ($err) {
                $reject($err);
            } else {
                $resolve($data);
            }
        };
        if ($options) {
            fs.readFile($path, $options, handler);
        }
        fs.readFile($path, handler);
    });
}

export function readFileAsJson($path: string): Promise<unknown> {
    return getFileContent($path, {encoding: 'utf-8',})
        .then(JSON.parse);
}

export function globToFiles($glob: string, $root?: string): Promise<Array<string>> {
    return new Promise(function globPromiseFactory($resolve, $reject) {
        function globResultHandler($err, $files) {
            if ($err) {
                $reject($err);
            } else {
                $resolve($files);
            }
        }

        if (typeof $root === 'string') {
            glob($glob, {root: $root}, globResultHandler);
        } else {
            glob($glob, globResultHandler);
        }
    });
}

export function writeFile($filePath: string, $data: string | Buffer, $options?: { encoding?: string | null, mode?: number, flag?: string, signal?: string, }): Promise<void> {
    return new Promise(($resolve, $reject) => {
        function cb($err) {
            if ($err) {
                $reject($err);
            } else {
                $resolve();
            }
        }

        if (typeof $options === 'object' && $options !== null) {
            fs.writeFile($filePath, $data, $options, cb);
        } else {
            fs.writeFile($filePath, $data, cb);
        }
    });
}

export function deleteFile($path: string): Promise<void> {
    return new Promise(($resolve, $reject) => {
        fs.unlink($path, $err => {
            if ($err) {
                $reject($err);
            } else {
                $resolve();
            }
        })
    });
}

export function deleteThenWrite($path: string, $content: string | Buffer, $options?: {encoding?: string, mode?: number, flag?: string}): Promise<void> {
    return fileExists($path)
        .then($exists => {
            if ($exists) {
                return deleteFile($path);
            }
        })
        .then(() => writeFile($path, $content, $options));
}

export function lsDir($dir: string): Promise<Array<string>> {
    return new Promise(($resolve, $reject) => {
        fs.readdir($dir, ($err, $files) => {
            if ($err) {
                $reject($err);
            } else {
                $resolve($files);
            }
        });
    });
}

export function isDir($item: string): Promise<boolean> {
    return new Promise(($resolve, $reject) => {
        fs.stat($item, ($err, $stats) => {
            if ($err) {
                $reject($err);
            } else {
                $resolve($stats.isDirectory());
            }
        })
    });
}

function makeDir($dirPath: string): Promise<string> {
    return new Promise(($resolve, $reject) => {
        fs.mkdir($dirPath, $err => {
            if ($err) {
                $reject($err);
            } else {
                $resolve($dirPath);
            }
        })
    });
}

export function ensureDirectoryExistence($dirPath: string): Promise<string> {
    return new Promise(($resolve, $reject) => {
        fs.stat($dirPath, ($err, ignore) => {
            if ($err) {
                // Do not exist
                makeDir($dirPath)
                    .then($resolve)
                    .catch($err => {
                        // Try to create parent directory recursively
                        const parentDir = path.dirname($dirPath);
                        if (!!parentDir || parentDir === '/' || /^\w:\\?/.test(parentDir)) {
                            return ensureDirectoryExistence(parentDir)
                                .then(() => makeDir($dirPath))
                                .then($resolve)
                                .catch($reject);
                        }
                        return Promise.reject($err);
                    });
            } else {
                $resolve($dirPath);
            }
        });
    });
}
