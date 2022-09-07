import {isElement, isNodeWithChildren} from "@such-code/html-parser-utils";
import {ChildNode, Element, Node} from 'domhandler';

export type SymbolDefinition = {
    id: string,
    symbol: Element,
    defs?: Array<Node>
}

export function svgToSymbol($svg: Array<Node>, $id: string): SymbolDefinition {
    const svgRootNode: Element | null = $svg.find(($node): $node is Element => {
        if (isElement($node)) {
            return $node.name.toLowerCase() === 'svg';
        }
        return false;
    });

    if (!svgRootNode) {
        throw new Error('SVG root node not found in an image.');
    }

    /** @var SymbolDefinition */
    let result = {
        id: $id,
        symbol: svgNodeToSymbolNode(svgRootNode, $id),
    };

    const rootNodeChildren = svgRootNode.children;
    const defsNode: Element | null = rootNodeChildren.find(($node): $node is Element => {
        if (isElement($node)) {
            return $node.name.toLowerCase() === 'defs';
        }
        return false;
    });

    if (defsNode) {
        const nonDefsNodes = rootNodeChildren.filter($ => $ !== defsNode);

        const defsNodes = defsNode.children;
        const remapMap = remapDefs(defsNodes, $id);

        // TODO: Patch all places where defs are referenced
        result.symbol.children = updateReferences(nonDefsNodes, remapMap)

        return {
            ...result,
            defs: defsNodes,
        }
    }

    return result;
}

export function filenameToId($filename: string): string {
    return $filename.replace(/\.+/g, '-').toLowerCase();
}

const allowedSymbolAttributeNames = [
    'id', 'style', 'viewBox', 'width', 'height', 'preserveAspectRatio', 'refX', 'refY', 'x', 'y', 'clip-path',
    'clip-rule', 'color', 'color-interpolation', 'color-rendering', 'cursor', 'display', 'fill', 'fill-opacity',
    'fill-rule', 'filter', 'mask', 'opacity', 'pointer-events', 'shape-rendering', 'stroke', 'stroke-dasharray',
    'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width',
    'transform', 'vector-effect', 'visibility',
];

export function svgNodeToSymbolNode($svg: Element, $id: string): Element {
    $svg.name = 'symbol';

    if (typeof $svg.attribs === 'object' && $svg.attribs !== null) {
        $svg.attribs = {
            id: $id,
            ...Object.keys($svg.attribs).reduce(($acc, $attributeName) => {
                if (allowedSymbolAttributeNames.indexOf($attributeName)) {
                    return {
                        ...$acc,
                        [$attributeName]: $svg.attribs[$attributeName],
                    };
                }
                return $acc;
            }, {}),
        };
    } else {
        $svg.attribs = {
            id: $id,
        };
    }

    return $svg;
}

function camelToKebabCase($string: string): string {
    return $string.replace(/[A-Z]+/g, function camelToKebabCaseReplacer($match, $offset) {
        const result = $match.toLowerCase();
        return $offset > 0
            ? '-' + result
            : result;
    });
}

function remapDefs($defs: Array<Node>, $id: string): Record<string, string> {
    let remap = {};
    const existingIds = new Map<string, number>();

    for (const node of $defs) {
       if (isElement(node)) {
           let newId = $id + '-' + camelToKebabCase(node.name);
           while (existingIds.has(newId)) {
               newId = newId + existingIds.get(newId);
           }
           existingIds.set(newId, existingIds.has(newId) ? existingIds.get(newId) + 1 : 1);

           remap = {
               ...remap,
               [node.attribs.id]: newId,
           };
           node.attribs = {
               ...node.attribs,
               id: newId,
           };
       }
    }
    return remap;
}

const urlRegExp = /url\(\s*(['"])?\s*#(.+?)\1\s*\)/;

function updateUrlValue($styleValue, $map) {
    return $styleValue.replace(urlRegExp, function regExp($match, $quote, $id) {
        if ($id in $map) {
            if ($quote) {
                return `url(${$quote}#${$map[$id]}${$quote})`;
            }
            return `url(#${$map[$id]})`;
        }
        return $match;
    });
}

function updateStyle($styleString, $map) {
    return $styleString
        .split(';')
        .map(function map($keyValueString) {
            const [styleKey, styleValue] = $keyValueString.split(':', 2).map(function map($) {return $.trim()});
            return `${styleKey}:${updateUrlValue(styleValue, $map)}`;
        }, {})
        .join(';');
}

function updateReferenceAttributes($attribs: Record<string, string>, $map: Record<string, string>): Record<string, string> {
    return Object.keys($attribs).reduce(function refReduce($acc, $key) {
        const value = $attribs[$key];

        if ($key.toLowerCase() === 'style') {
            return {
                ...$acc,
                style: updateStyle(value, $map),
            };
        }

        return {
            ...$acc,
            [$key]: updateUrlValue(value, $map),
        };
    }, {});
}

function updateReferences($nodes: Array<ChildNode>, $map: Record<string, string>): Array<ChildNode> {
    for (const node of $nodes) {
        if (isElement(node)) {
            node.attribs = updateReferenceAttributes(node.attribs, $map);
        }

        if (isNodeWithChildren(node)) {
            updateReferences(node.children, $map);
        }
    }

    return $nodes;
}
