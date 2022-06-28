export interface ExtractIconEvent {
  type: 'extractIcon'
  payload: {
    fileKey: string
    ids: string
    nodes: Array<{ id: string, name: string }>
  }
}

export interface GetTokenEvent {
  type: 'getToken'
  payload: {
    figmaToken?: string
    githubToken?: string
  }
}

interface PluginMessageEvent {
  pluginMessage: ExtractIconEvent | GetTokenEvent
}

export default PluginMessageEvent
