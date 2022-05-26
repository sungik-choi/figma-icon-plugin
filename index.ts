/**
 * TODO
 * 1. Find all instance node of selection
 * 2. List all instance node
 * 3. Sort instance node by name
 * 4. Make svg file from instance node
 * 5. Post to Github
 */

const isComponentNode = (node: SceneNode) => node.type === 'COMPONENT' || node.type === 'INSTANCE'

const findAllInstanceNode = (rootNode: SceneNode) => {
  const result: SceneNode[] = []
  function findNode(node: SceneNode) {
    if (isComponentNode(node)) {
      result.push(node)
      return
    }
    if ('children' in node) {
      node.children.forEach(findNode)
    }
  }
  findNode(rootNode)
  return result
}

const flatten = <T>(a: Array<T>, b: Array<T>) => [...a, ...b]

function run() {
  figma.showUI(__html__);

  console.log(figma.fileKey)

  figma.ui.onmessage = async msg => {
    if (msg.type === 'extract') {
      figma.currentPage.selection
        .map(findAllInstanceNode)
        .reduce(flatten, [])
    }

    if (msg.type === 'cancel') {
      figma.closePlugin();
    }
  };
}

run()