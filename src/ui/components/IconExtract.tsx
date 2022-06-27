/* External dependencies */
import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate } from "react-router-dom"
import {
  FormControl,
  FormLabel,
  TextField,
  Button,
  ButtonColorVariant,
  ButtonStyleVariant,
  VStack,
  HStack,
  Spacer,
  StackItem,
  ProgressBar,
  Text,
  Typography,
} from '@channel.io/bezier-react';

/* Internal dependencies */
import useFigmaAPI from '../hooks/useFigmaAPI';
import useGithubAPI from '../hooks/useGithubAPI';

const EXTRACT_PATH = "test"
const DEFAULT_BRANCH_NAME = 'main'

enum Step {
  Pending,
  Progress,
  Resolved,
}

function IconExtract() {
  const navigate = useNavigate()

  const [figmaToken, setFigmaToken] = useState("")
  const [githubToken, setGithubToken] = useState("")

  const [step, setStep] = useState(Step.Pending)

  const handleChangeFigmaToken = useCallback<React.ChangeEventHandler<HTMLInputElement>>((event) => {
    setFigmaToken(event.currentTarget.value)
  }, [])

  const handleChangeGithubToken = useCallback<React.ChangeEventHandler<HTMLInputElement>>((event) => {
    setGithubToken(event.currentTarget.value)
  }, [])

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>((event) => {
    event.preventDefault()
    setStep(Step.Progress)
    parent.postMessage({ pluginMessage: { type: 'extract' } }, '*')
  }, [])

  const handleClickCancel = useCallback(() => {
    navigate("/")
  }, [])

  const handleExtractError = useCallback(() => {
    setStep(Step.Pending)
  }, [])

  return (
    <form onSubmit={handleSubmit}>
      <VStack align="stretch">
        <StackItem>
          <VStack align="stretch" spacing={12}>
            <StackItem>
              <FormControl required readOnly={step !== Step.Pending}>
                <FormLabel help="좌측 상단 Figma 로고 > Help and account > Account settings 에서 발급 받을 수 있습니다.">
                  Figma personal access token
                </FormLabel>
                <TextField
                  name="figmaToken"
                  placeholder="figd_..."
                  value={figmaToken}
                  onChange={handleChangeFigmaToken}
                />
              </FormControl>
            </StackItem>
            <StackItem>
              <FormControl required readOnly={step !== Step.Pending}>
                <FormLabel help="디자인 시스템 담당 개발자에게 문의해주세요!">
                  Github personal access token
                </FormLabel>
                <TextField
                  name="githubToken"
                  placeholder="ghp_..."
                  value={githubToken}
                  onChange={handleChangeGithubToken}
                />
              </FormControl>
            </StackItem>
            <StackItem>
              <FormControl readOnly>
                <FormLabel>추출할 경로 (루트 기준)</FormLabel>
                <TextField value={EXTRACT_PATH} />
              </FormControl>
            </StackItem>
          </VStack>
        </StackItem>

        <Spacer />

        <StackItem>
          {step === Step.Pending && (
            <HStack justify="end" spacing={6}>
              <StackItem>
                <Button
                  type="submit"
                  styleVariant={ButtonStyleVariant.Primary}
                  colorVariant={ButtonColorVariant.Blue}
                  text="아이콘 추출"
                />
              </StackItem>
              <StackItem>
                <Button
                  styleVariant={ButtonStyleVariant.Secondary}
                  colorVariant={ButtonColorVariant.MonochromeDark}
                  text="선택 단계로"
                  onClick={handleClickCancel}
                />
              </StackItem>
            </HStack>
          )}

          {step === Step.Progress && (
            <Progress
              figmaToken={figmaToken}
              githubToken={githubToken}
              extractPath={EXTRACT_PATH}
              onError={handleExtractError}
            />
          )}
        </StackItem>
      </VStack>
    </form>
  )
};

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

interface ProgressProps {
  figmaToken: string
  githubToken: string
  extractPath: string
  onError: () => void
}

// function createSvgBlob(path: string) {
//   return {
//     path,
//     mode: '100644',
//     type: 'blob',
//     sha,
//   }
// }

function Progress({
  figmaToken,
  githubToken,
  extractPath,
  onError,
}: ProgressProps) {
  const [progressValue, setProgressValue] = useState(0)
  const [progressText, setProgressText] = useState("")

  const figmaAPI = useFigmaAPI({ token: figmaToken })

  const githubAPI = useGithubAPI({
    auth: githubToken,
    owner: 'sungik-choi',
    repo: 'figma-icon-plugin',
  })

  useEffect(function bindOnMessageHandler() {
    window.onmessage = async (event: MessageEvent<PluginMessageEvent>) => {
      const { type, payload } = event.data.pluginMessage

      if (type === 'fetchSvg') {
        try {
          const { fileKey, ids, nodes } = payload

          setProgressText("피그마에서 svg를 가져오는 중...")
          const { images } = await figmaAPI.getSvg({ fileKey, ids })
          console.log(images)
          setProgressValue(prev => prev + 0.1)

          setProgressText("svg를 파일로 만드는 중...")
          const svgBlobs = await Promise.all(
            nodes.map(({ id, name }) => fetch(images[id])
              .then(response => response.text())
              .then(svg => githubAPI
                .createGitBlob(svg)
                .then(({ sha }) => ({ name, sha }))
              ))
          )
          setProgressValue(prev => prev + 0.1)

          const defaultRef = await githubAPI.getGitRef(DEFAULT_BRANCH_NAME)
          const headCommit = await githubAPI.getGitCommit(defaultRef.sha)
          const headTree = await githubAPI.getGitTree(headCommit.sha)

          const svgBlobsTree = headTree.find(({ path }) => path === extractPath)

          console.log(svgBlobs, defaultRef, headCommit, headTree, svgBlobsTree)
        } catch(e) {
          console.log(e)
          onError()
        }
      }
    }
  }, [])

  return (
    <VStack align="stretch" spacing={6}>
      <StackItem>
        <ProgressBar
          width="100%"
          value={progressValue}
        />
      </StackItem>
      <StackItem>
        <Text>{progressText}</Text>
      </StackItem>
    </VStack>
  )
};

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

export default IconExtract;
