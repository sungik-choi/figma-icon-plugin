import { flatten, findAllComponentNode } from './utils'
import { ExtractIconEvent, GetTokenEvent } from '../types/Message'

console.info('Figma file key: ', figma.fileKey)

figma.showUI(__html__, { width: 400, height: 300 })

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'extract') {
    extractIcon()
  }

  if (msg.type === 'getToken') {
    const token = await figma.clientStorage.getAsync('token')
    const pluginMessage: GetTokenEvent = {
      type: 'getToken',
      payload: token,
    }

    figma.ui.postMessage(pluginMessage)
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

  const pluginMessage: ExtractIconEvent = {
    type: 'extractIcon',
    payload: {
      fileKey: figma.fileKey as string,
      ids: componentNodesIdsQuery,
      nodes: componentNodes,
    }
  }
  
  figma.ui.postMessage(pluginMessage)
}