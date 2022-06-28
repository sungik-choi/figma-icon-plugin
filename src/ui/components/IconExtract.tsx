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
} from '@channel.io/bezier-react';

/* Internal dependencies */
import useFigmaAPI from '../hooks/useFigmaAPI';
import useGithubAPI from '../hooks/useGithubAPI';

const EXTRACT_PATH = "packages/foo/src/components/Icon/assets"
const BASE_BRANCH_NAME = 'main'

enum Step {
  Pending,
  Processing,
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
    setStep(Step.Processing)
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

          {step === Step.Processing && (
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

function createSvgGitBlob(path: string, sha: string) {
  return {
    path,
    mode: '100644',
    type: 'blob',
    sha,
  } as const
}

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
          // if (!images) {
          //   throw new Error('선택된 아이콘이 없습니다. 아이콘이 포함된 프레임이 올바르게 선택되었는지 확인해주세요.')
          // }
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

          const baseRef = await githubAPI.getGitRef(BASE_BRANCH_NAME)
          const headCommit = await githubAPI.getGitCommit(baseRef.sha)
          const headTree = await githubAPI.getGitTree(headCommit.sha)

          const splittedPaths = extractPath.split('/')

          let targetTreeSha: string = ""
          const parentTrees: Awaited<ReturnType<typeof githubAPI['getGitTree']>>[] = []
          const targetTrees: Awaited<ReturnType<typeof githubAPI['getGitTree']>> = []

          const svgBlobsTree = await splittedPaths.reduce(async (parentTreePromise, splittedPath) => {
            const parentTree = await parentTreePromise
            const targetTree = parentTree.find(({ path }) => path === splittedPath)
            if (!targetTree || !targetTree.sha) { 
              throw new Error('해당 추출 경로가 없습니다. 올바른 경로를 입력했는지 확인해주세요.')
            }
            targetTreeSha = targetTree.sha
            parentTrees.push(parentTree)
            targetTrees.push(targetTree)
            return githubAPI.getGitTree(targetTree.sha)
          }, Promise.resolve(headTree))

          const svgTreeObj = svgBlobs.reduce((acc, { name, sha }) => {
            const path = `${EXTRACT_PATH}/${name}.svg`
            return { ...acc, [path]: createSvgGitBlob(path, sha) }
          }, {} as { [path: string]: ReturnType<typeof createSvgGitBlob> })

          console.log(headTree, svgBlobsTree)

          console.log(parentTrees, targetTrees)

          const newTree = [
            ...headTree,
            ...svgBlobsTree.map((blob) => {
              const overridedBlob = svgTreeObj[blob.path as string]
              if (overridedBlob) {
                delete svgTreeObj[blob.path as string]
                return { ...blob, ...overridedBlob }
              }
              return blob
            }),
            ...Object.values(svgTreeObj)
          ]

          const newGitTree = await githubAPI.createGitTree({
            baseTreeSha: headCommit.sha,
            //@ts-ignore
            tree: newTree,
          })

          const now = new Date()

          const newCommit = await githubAPI.createGitCommit({
            message: 'feat(icons): update icons',
            author: {
              name: 'sungik-choi',
              email: 'sungik.dev@gmail.com',
              date: now.toISOString(),
            },
            parents: [headCommit.sha],
            tree: newGitTree.sha,
          })

          const newBranchName = `update-icons-${now.valueOf()}`

          await githubAPI.createGitRef({
            branchName: newBranchName,
            sha: newCommit.sha,
          })

          await githubAPI.createPullRequest({
            title: '📦 피그마에서 아이콘이 왔다네',
            body: '머지하시게',
            head: newBranchName,
            base: BASE_BRANCH_NAME,
          })
          
        } catch(e: any) {
          console.log(e)
          console.log(e?.type, e?.message)
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
