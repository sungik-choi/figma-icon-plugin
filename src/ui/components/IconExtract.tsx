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
  FormHelperText,
  FormErrorMessage,
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
import useFigmaAPI from '../hooks/useFigmaAPI'
import useGithubAPI from '../hooks/useGithubAPI'
import { createSvgGitBlob } from '../utils'
import config from '../../config'
import type PluginMessageEvent from '../../types/Message'

enum Step {
  Pending,
  Processing,
  Resolved,
}

function IconExtract() {
  const navigate = useNavigate()

  const [figmaToken, setFigmaToken] = useState("")
  const [githubToken, setGithubToken] = useState("")

  const [errorMessage, setErrorMessage] = useState("")

  const [step, setStep] = useState(Step.Pending)

  useEffect(function getTokenFromLocalStorage() {
    parent.postMessage({ pluginMessage: { type: 'getToken' } }, '*')
  }, [])

  useEffect(function bindOnMessageHandler() {
    window.onmessage = async (event: MessageEvent<PluginMessageEvent>) => {
      const { type, payload } = event.data.pluginMessage

      if (type === 'getToken') {
        setFigmaToken(payload?.figmaToken ?? '')
        setGithubToken(payload?.githubToken ?? '')
      }
    }
  }, [])

  const handleChangeFigmaToken = useCallback<React.ChangeEventHandler<HTMLInputElement>>((event) => {
    setFigmaToken(event.currentTarget.value)
  }, [])

  const handleChangeGithubToken = useCallback<React.ChangeEventHandler<HTMLInputElement>>((event) => {
    setGithubToken(event.currentTarget.value)
  }, [])

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>((event) => {
    setErrorMessage("")
    event.preventDefault()
    setStep(Step.Processing)
    parent.postMessage({ pluginMessage: { type: 'extract' } }, '*')
  }, [])

  const handleClickCancel = useCallback(() => {
    navigate("/")
  }, [])

  const handleExtractError = useCallback((msg: string) => {
    setStep(Step.Pending)
    setErrorMessage(msg)
  }, [])

  return (
    <form onSubmit={handleSubmit}>
      <VStack align="stretch">
        <StackItem>
          <VStack align="stretch" spacing={12}>
            <StackItem>
              <FormControl required readOnly={step !== Step.Pending}>
                <FormLabel help="?????? ?????? Figma ?????? > Help and account > Account settings ?????? ?????? ?????? ??? ????????????.">
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
                <FormLabel help="?????? ??????????????? ?????? ????????? ?????? ????????? ??????????????????.">
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
                <FormLabel>????????? ?????? (?????? ??????)</FormLabel>
                <TextField value={config.repository.iconExtractPath} />
              </FormControl>
            </StackItem>
            <StackItem marginBefore={4}>
              {errorMessage
                ? <FormErrorMessage>{ errorMessage }</FormErrorMessage>
                : <FormHelperText>????????? ?????? ?????? ??? ?????? ??????????????? ???????????????.</FormHelperText>}
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
                  text="????????? ??????"
                />
              </StackItem>
              <StackItem>
                <Button
                  styleVariant={ButtonStyleVariant.Secondary}
                  colorVariant={ButtonColorVariant.MonochromeDark}
                  text="?????? ?????????"
                  onClick={handleClickCancel}
                />
              </StackItem>
            </HStack>
          )}

          {step === Step.Processing && (
            <Progress
              figmaToken={figmaToken}
              githubToken={githubToken}
              onError={handleExtractError}
            />
          )}
        </StackItem>
      </VStack>
    </form>
  )
};

interface ProgressProps {
  figmaToken: string
  githubToken: string
  onError: (msg: string) => void
}

function Progress({
  figmaToken,
  githubToken,
  onError,
}: ProgressProps) {
  const navigate = useNavigate()

  const [progressValue, setProgressValue] = useState(0)
  const [progressText, setProgressText] = useState("")

  const figmaAPI = useFigmaAPI({ token: figmaToken })

  const githubAPI = useGithubAPI({
    auth: githubToken,
    owner: config.repository.owner,
    repo: config.repository.name,
  })

  useEffect(function bindOnMessageHandler() {
    window.onmessage = async (event: MessageEvent<PluginMessageEvent>) => {
      const { type, payload } = event.data.pluginMessage

      if (type === 'extractIcon') {
        try {
          const { fileKey, ids, nodes } = payload

          setProgressText("???? ??????????????? svg??? ???????????? ???...")
          const { images } = await figmaAPI.getSvg({ fileKey, ids })
          if (!images) {
            throw new Error('????????? ???????????? ????????? ????????? ????????? ???????????????.')
          }
          setProgressValue(prev => prev + 0.2)

          setProgressText("???? svg??? ????????? ????????? ???...")
          const svgBlobs = await Promise.all(
            nodes.map(({ id, name }) => fetch(images[id])
              .then(response => response.text())
              .then(svg => githubAPI
                .createGitBlob(svg)
                .then(({ sha }) => ({ name, sha }))
              ))
          )

          const svgBlobsMap = svgBlobs.reduce((acc, { name, sha }) => {
            const path = `${name}.svg`
            return { ...acc, [path]: createSvgGitBlob(path, sha) }
          }, {} as { [path: string]: ReturnType<typeof createSvgGitBlob> })

          const newSvgBlobs = Object.values(svgBlobsMap)
          setProgressValue(prev => prev + 0.3)

          setProgressText("???? svg ????????? ???????????? ???...")
          const baseRef = await githubAPI.getGitRef(config.repository.baseBranchName)
          const headCommit = await githubAPI.getGitCommit(baseRef.sha)
          const headTree = await githubAPI.getGitTree(headCommit.sha)

          const splittedPaths = config.repository.iconExtractPath.split('/')

          const parentTrees: Awaited<ReturnType<typeof githubAPI['getGitTree']>>[] = []

          const prevSvgBlobsTree = await splittedPaths.reduce(async (parentTreePromise, splittedPath) => {
            const parentTree = await parentTreePromise
            const targetTree = parentTree.find(({ path }) => path === splittedPath)
            if (!targetTree || !targetTree.sha) { 
              throw new Error(`${splittedPath} ????????? ????????????. ????????? ????????? ??????????????? ??????????????????.`)
            }
            parentTrees.push(parentTree)
            return githubAPI.getGitTree(targetTree.sha)
          }, Promise.resolve(headTree))

          const newSvgBlobsTree = [
            ...prevSvgBlobsTree.map((blob) => {
              const overridedBlob = svgBlobsMap[blob.path as string]
              if (overridedBlob) {
                delete svgBlobsMap[blob.path as string]
                return { ...blob, ...overridedBlob }
              }
            }).filter(Boolean),
            ...newSvgBlobs
          ]

          const newGitSvgTree = await githubAPI.createGitTree({
            //@ts-ignore
            tree: newSvgBlobsTree,
          })

          const newRootGitTree = await splittedPaths.reduceRight(async (prevTreePromise, cur, index) => {
            const parentTree = parentTrees[index]
            const targetTree = parentTree.find(({ path }) => path === cur)
            const { sha } = await prevTreePromise
            return githubAPI.createGitTree({
              tree: [
                // @ts-ignore
                ...parentTree.filter(({ path }) => path !== cur), { ...targetTree, sha }
              ],
            })
          }, Promise.resolve(newGitSvgTree))
          setProgressValue(prev => prev + 0.3)

          setProgressText("???? PR??? ??????????????? ???...")
          const now = new Date()

          const newCommit = await githubAPI.createGitCommit({
            message: config.commit.message,
            author: {
              ...config.commit.author,
              date: now.toISOString(),
            },
            parents: [headCommit.sha],
            tree: newRootGitTree.sha,
          })

          const newBranchName = `update-icons-${now.valueOf()}`

          await githubAPI.createGitRef({
            branchName: newBranchName,
            sha: newCommit.sha,
          })
          setProgressValue(prev => prev + 0.2)

          const { html_url } = await githubAPI.createPullRequest({
            ...config.pr,
            head: newBranchName,
            base: config.repository.baseBranchName,
          })

          parent.postMessage({
            pluginMessage: {
              type: 'setToken',
              payload: { figmaToken, githubToken }
            }
          }, '*')

          navigate('../extract_success', { state: { url: html_url } })
        } catch(e: any) {
          onError(e?.message)
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

export default IconExtract;
