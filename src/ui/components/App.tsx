/* External dependencies */
import React, { useEffect, useCallback } from 'react';
import {
  BezierProvider,
  LightFoundation,
  Button,
  ButtonColorVariant,
  ButtonStyleVariant,
  HStack,
  StackItem,
} from '@channel.io/bezier-react';

/* Internal dependencies */
import useFigmaAPI from '../hooks/useFigmaAPI';
import useGithubAPI from '../hooks/useGithubAPI';

const FIGMA_TEST_TOKEN = ''
const GITHUB_TEST_TOKEN = ''

const DEFAULT_BRANCH_NAME = 'main'
const SVG_DIR_NAME = 'test'

interface PluginMessageEvent {
  pluginMessage: {
    type: 'fetchSvg',
    payload: {
      fileKey: string
      ids: string
      nodes: ComponentNode[]
    }
  }
}

// function createSvgBlob(path: string) {
//   return {
//     path,
//     mode: '100644',
//     type: 'blob',
//     sha,
//   }
// }

function App() {
  const figmaAPI = useFigmaAPI({ token: FIGMA_TEST_TOKEN })

  const githubAPI = useGithubAPI({
    auth: GITHUB_TEST_TOKEN,
    owner: 'sungik-choi',
    repo: 'figma-icon-plugin',
  })

  useEffect(function bindOnMessageHandler() {
    window.onmessage = async (event: MessageEvent<PluginMessageEvent>) => {
      const { type, payload } = event.data.pluginMessage

      if (type === 'fetchSvg') {
        const { fileKey, ids, nodes } = payload

        const { images } = await figmaAPI.getSvg({ fileKey, ids })

        const svgBlobs = await Promise.all(
          nodes.map(({ id, name }) => fetch(images[id])
            .then(response => response.text())
            .then(svg => githubAPI
              .createGitBlob(svg)
              .then(({ sha }) => ({ name, sha }))
            ))
        )

        const defaultRef = await githubAPI.getGitRef(DEFAULT_BRANCH_NAME)
        const headCommit = await githubAPI.getGitCommit(defaultRef.sha)
        const headTree = await githubAPI.getGitTree(headCommit.sha)

        const svgBlobsTree = headTree.find(({ path }) => path === SVG_DIR_NAME)

        console.log(svgBlobs, defaultRef, headCommit, headTree, svgBlobsTree)
      }
    }
  }, [])
  
  const handleClickExtract = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: 'extract' } }, '*')
  }, [])

  const handleClickCancel = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')
  }, [])

  return (
    <BezierProvider foundation={LightFoundation}>
      <HStack spacing={6}>
        <StackItem>
          <Button
            styleVariant={ButtonStyleVariant.Primary}
            colorVariant={ButtonColorVariant.Blue}
            text="아이콘 추출"
            onClick={handleClickExtract}
          />
        </StackItem>
        <StackItem>
          <Button
            styleVariant={ButtonStyleVariant.Secondary}
            colorVariant={ButtonColorVariant.MonochromeDark}
            text="종료"
            onClick={handleClickCancel}
          />
        </StackItem>
      </HStack>
    </BezierProvider>
  )
};

export default App;

// const newTree = await (async function() {
//   if (hasDirectory) {
//     // Get the tree of the the svg blobs tree
//     const { data: { tree: svgBlobsTree } } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
//       owner: 'sungik-choi',
//       repo: 'figma-icon-plugin',
//       tree_sha: svgBlobsTreeBlob.sha,
//     })

//     // Create a new Key value pair of git tree
//     const svgTreeObj = svgBlobs.reduce((acc, { name, sha }) => {
//       const path = `${name}.svg`
//       return { ...acc, [path]: { path, mode: '100644', type: 'blob', sha } }
//     }, {})

//     // Merge tree
//     return [
//       ...headTree.filter(({ path }) => path !== SVG_DIR_NAME),
//       ...svgBlobsTree.map((blob) => {
//         const overridedBlob = svgTreeObj[blob.path]
//         if (overridedBlob) {
//           delete svgTreeObj[blob.path]
//           return { ...blob, ...overridedBlob }
//         }
//         return blob
//       }),
//       ...Object.values(svgTreeObj)
//     ]
//   } else {
//     // Create a new Key value pair of git tree
//     const svgTreeObj = svgBlobs.reduce((acc, { name, sha }) => {
//       const path = `${SVG_DIR_NAME}/${name}.svg`
//       return { ...acc, [path]: { path, mode: '100644', type: 'blob', sha } }
//     }, {})

//     // Merge tree
//     return [
//       ...headTree.map((blob) => {
//         const overridedBlob = svgTreeObj[blob.path]
//         if (overridedBlob) {
//           delete svgTreeObj[blob.path]
//           return { ...blob, ...overridedBlob }
//         }
//         return blob
//       }),
//       ...Object.values(svgTreeObj)
//     ]
//   }
// })()

// console.log(newTree)

// // Generate new tree with the new svg assets
// const { data: gitTree } = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
//   owner: 'sungik-choi',
//   repo: 'figma-icon-plugin',
//   tree: newTree,
// })

// const now = new Date()

// // Create a new commit object with the new tree
// const { data: commit } = await octokit.rest('POST /repos/{owner}/{repo}/git/commits', {
//   owner: 'sungik-choi',
//   repo: 'figma-icon-plugin',
//   message: 'feat(icons): update icons',
//   author: {
//     name: 'sungik-choi',
//     email: 'sungik.dev@gmail.com',
//     date: now.toISOString(),
//   },
//   parents: [headCommitSha],
//   tree: gitTree.sha,
// })

// const newBranchName = `update-icons-${now.valueOf()}`
// const newRef = `refs/heads/${newBranchName}`

// // Create a new branch with the same sha
// const { data } = await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
//   owner: 'sungik-choi',
//   repo: 'figma-icon-plugin',
//   ref: newRef,
//   sha: commit.sha,
// })

// // Create Pull Request
// await octokit.request('POST /repos/{owner}/{repo}/pulls', {
//   owner: 'sungik-choi',
//   repo: 'figma-icon-plugin',
//   title: '📦 피그마에서 아이콘이 왔다네',
//   body: '머지하시게',
//   head: newBranchName,
//   base: 'main',
// })