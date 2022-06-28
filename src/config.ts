const config = {
  repository: {
    name: 'figma-icon-plugin',
    iconExtractPath: 'packages/foo/src/components/Icon/assets',
    baseBranchName: 'main',
    owner: 'sungik-choi',
  },
  commit: {
    message: 'feat(icons): extract icon from Figma',
    author: {
      name: 'sungik-choi',
      email: 'sungik.dev@gmail.com',
    }
  },
  pr: {
    title: 'feat(icons): extract icon from Figma',
    body: 'Extract icon from Figma',
  }
}

export default config
