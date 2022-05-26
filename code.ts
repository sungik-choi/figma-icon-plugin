/**
 * TODO
 * 1. Find all instance node of selection
 * 2. List all instance node
 * 3. Sort instance node by name
 * 4. Make svg file from instance node
 * 5. Post to Github
 */

figma.showUI(__html__);

const isInstanceNode = (node: SceneNode) => node.type === 'INSTANCE'

const findAllInstanceNode = (rootNode: SceneNode) => {
  const result: SceneNode[] = []
  function findNode(node: SceneNode) {
    if (isInstanceNode(node)) {
      result.push(node)
      return
    }
    // @ts-ignore
    if (!node?.children) { return }
    // @ts-ignore
    node.children.forEach(findNode)
  }
  findNode(rootNode)
  return result
}

figma.ui.onmessage = msg => {
  console.log(
    figma.currentPage.selection
      .map(findAllInstanceNode)
      .reduce((acc, cur) => acc.concat(cur), [])
  )

  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.

  if (msg.type === 'create-rectangles') {
    const nodes: SceneNode[] = [];
    for (let i = 0; i < msg.count; i++) {
      const rect = figma.createRectangle();
      rect.x = i * 150;
      rect.fills = [{type: 'SOLID', color: {r: 1, g: 0.5, b: 0}}];
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};
