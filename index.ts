/**
 * TODO
 * 1. Find all instance node of selection
 * 2. List all instance node
 * 3. Sort instance node by name
 * 4. Make svg file from instance node
 * 5. Post to Github
 */

const TEST_TOKEN = 'figd_tSvRu6SuTYR3nyGx-yl79-Wg5HwuU4sa9nz6QkUF'

const isComponentNode = (node: SceneNode): node is ComponentNode => node.type === 'COMPONENT' || node.type === 'INSTANCE'

const findAllComponentNode = (rootNode: SceneNode) => {
  const result: ComponentNode[] = []
  function findComponentNode(node: SceneNode) {
    if (isComponentNode(node)) {
      result.push(node)
      return
    }
    if ('children' in node) {
      node.children.forEach(findComponentNode)
    }
  }
  findComponentNode(rootNode)
  return result
}

const flatten = <T>(a: Array<T>, b: Array<T>) => [...a, ...b]

const hash = (path: string) => path
  .replace(/^.*\/img\//g, '')
  .replace(/\//g, '_');

function run() {
  console.info('Figma file key: ', figma.fileKey)
  
  figma.showUI(__html__);

  figma.ui.onmessage = msg => {
    if (msg.type === 'extract') {
      const componentNodes = figma.currentPage.selection
        .map(findAllComponentNode)
        .reduce(flatten, [])
  
      const componentNodesIdsQuery = componentNodes
        .map(node => node.id)
        .join(',')
      
      figma.ui.postMessage({
        type: 'fetchSvg',
        payload: {
          nodes: componentNodes.map(({ id, name }) => ({ id, name })),
          url: `https://api.figma.com/v1/images/${figma.fileKey}?ids=${componentNodesIdsQuery}&format=svg`,
          token: TEST_TOKEN,
        }
      })
    }

    if (msg.type === 'fetchSvgSuccess') {
      console.log(msg.payload)
    }

    if (msg.type === 'cancel') {
      figma.closePlugin();
    }
  };
}

run()