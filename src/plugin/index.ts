import { flatten, findAllComponentNode } from './utils'

console.info('Figma file key: ', figma.fileKey)

figma.showUI(__html__, { width: 400, height: 300 })

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'extract') {
    extractIcon()
  }

  if (msg.type === 'getToken') {
    const token = await figma.clientStorage.getAsync('token')
    figma.ui.postMessage({
      type: 'getToken',
      payload: token,
    })
  }

  if (msg.type === 'setToken') {
    await figma.clientStorage.setAsync('token', msg.payload)
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
    type: 'extractIcon',
    payload: {
      fileKey: figma.fileKey,
      ids: componentNodesIdsQuery,
      nodes: componentNodes,
    }
  })
}