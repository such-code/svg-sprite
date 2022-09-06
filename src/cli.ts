import * as path from "path";
import {Element, Node} from "domhandler";
import {DomRenderer, stringToDom} from "@such-code/html-parser-utils";
import {argvToObject} from "./argv-utils";
import {deleteThenWrite, getFileContent, globToFiles, readFileAsJson} from "./utils";
import {filenameToId, svgToSymbol} from "./svg-utils";
import {isArgumentsWithConfig, isArgumentsWithSource} from "./cli-utils";

const [, , ...cliArgv] = process.argv;
const argv = argvToObject(cliArgv);

const isWindows = process.platform === 'win32';
const newLine = isWindows ? '\r\n' : '\n';

if (!isArgumentsWithSource(argv) && !isArgumentsWithConfig(argv)) {
    console.error('Incorrect arguments. Usage example:' + newLine +
        '\tsvg-sprite --config "config/file.json" --target "target/output.svg"' + newLine +
        '\tsvg-sprite --source "assets/**.svg" --target "target/output.svg"');
    process.exit(1);
}

const rootDir = process.cwd();

const sourcePromise = isArgumentsWithSource(argv)
    ? globToFiles(argv.source, rootDir)
    : readFileAsJson(argv.config).then($files => {
        if (!Array.isArray($files)) {
            throw new Error('Configuration file must provide array of strings.')
        }

        const relativeToConfigPath = path.dirname(path.relative(rootDir, argv.config));
        return $files.map($ => {
            if (/^\.{1,2}\//.test($)) {
                return path.join(relativeToConfigPath, $);
            }
            return $;
        });
    });

type LoadedSvg = {
    path: string,
    dom: Array<Node>,
}

function loadSvg($filePath: string): Promise<LoadedSvg> {
    return getFileContent($filePath, {encoding: 'utf-8',})
        .then($ => $ instanceof Buffer ? $.toString() : $)
        .then($ => stringToDom($, {xmlMode: true}))
        .then($ => {
            return <LoadedSvg>{
                path: $filePath,
                dom: $,
            };
        });
}

sourcePromise
    .then($files => {
        console.log('Loading files...');
        return Promise.all(
            $files.map(loadSvg),
        );
    })
    .then($loadedFiles => {
        console.log('Processing files...');
        return $loadedFiles.map($file => {
            const parsedPath = path.parse($file.path);
            const id = filenameToId(parsedPath.name);
            return svgToSymbol($file.dom, id);
        });
    })
    .then($symbols => {
        console.log('Merging result...');
        const svg = new Element(
            'svg',
            {xmlns: 'http://www.w3.org/2000/svg'},
            $symbols.map($ => $.symbol),
        );

        const flatDefs = $symbols.reduce(($acc, $symbol) => {
            if (Array.isArray($symbol.defs) && $symbol.defs.length > 0) {
                return $acc.concat($symbol.defs);
            }
            return $acc;
        }, []);

        if (flatDefs.length > 0) {
            const defs = new Element(
                'defs',
                {},
                flatDefs,
            );

            svg.children = [
                defs,
                ...svg.children,
            ];
        }

        const renderer = new DomRenderer();

        return renderer.renderNode(svg);
    })
    .then($renderedSvg => {
        const target = /^\.{1,2}\//.test(argv.target)
            ? path.join(rootDir, argv.target)
            : argv.target;

        console.log(`Writing result to "${target}"...`)
        return deleteThenWrite(target, $renderedSvg, {encoding: 'utf-8'});
    })
    .then(() => {
        console.log('Done!');
    });

