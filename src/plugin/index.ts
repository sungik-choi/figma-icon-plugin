import { flatten, findAllComponentNode } from './utils'

console.info('Figma file key: ', figma.fileKey)

figma.showUI(__html__)

figma.ui.onmessage = msg => {
  if (msg.type === 'extract') {
    extractIcon()
  }

  if (msg.type === 'cancel') {
    figma.closePlugin()
  }
};

function extractIcon() {
  const componentNodes = figma.currentPage.selection
    .map(findAllComponentNode)
    .reduce(flatten, []) 
    .map(({ id, name }) => ({ id, name }))

  const componentNodesIdsQuery = componentNodes
    .map(({ id }) => id)
    .join(',')

  figma.ui.postMessage({
    type: 'fetchSvg',
    payload: {
      fileKey: figma.fileKey,
      ids: componentNodesIdsQuery,
      nodes: componentNodes,
    }
  })
}