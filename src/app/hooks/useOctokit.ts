import { useRef, useCallback } from "react"
import { Octokit } from "octokit"
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods"

interface UseOctokitProps {
  auth: string
  owner: string
  repo: string
}

type CreateBlobParmeters = RestEndpointMethodTypes['git']['createBlob']['parameters']
type GetGitTreeParmeters = RestEndpointMethodTypes['git']['getTree']['parameters']
type CreateGitTreeParmeters = RestEndpointMethodTypes['git']['createTree']['parameters']
type CreateGitCommitParameters = RestEndpointMethodTypes['git']['createCommit']['parameters']
type CreateGitRefParameters = RestEndpointMethodTypes['git']['createRef']['parameters']
type CreatePullRequestParameters = RestEndpointMethodTypes['pulls']['create']['parameters']

function useOctokit({
  auth,
  owner,
  repo,
}: UseOctokitProps) {
  const octokit = useRef(new Octokit({ auth }))

  const createGitBlob = useCallback(async (content: CreateBlobParmeters['content']) => {
    const { data } = await octokit.current.rest.git.createBlob({
      owner,
      repo,
      content,
      encoding: 'utf-8',
    })
    return data
  }, [])

  const getGitLatestCommit = useCallback(async (branchName: string) => {
    const { data } = await octokit.current.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branchName}`
    })
    return data.object
  }, [])

  const getGitTree = useCallback(async (treeSha: GetGitTreeParmeters['tree_sha']) => {
    const { data } = await octokit.current.rest.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
    })
    return data.tree
  }, [])

  const createGitTree = useCallback(async (tree: CreateGitTreeParmeters['tree']) => {
    const { data } = await octokit.current.rest.git.createTree({
      owner,
      repo,
      tree,
    })
    return data
  }, [])

  const createGitCommit = useCallback(async (params: {
    message: CreateGitCommitParameters['message']
    author: CreateGitCommitParameters['author']
    parents: CreateGitCommitParameters['parents']
    tree: CreateGitCommitParameters['tree']
  }) => {
    const { data } = await octokit.current.rest.git.createCommit({
      owner,
      repo,
      ...params,
    })
    return data
  }, [])

  const createGitBranch = useCallback(async ({
    branchName,
    sha,
  }: { branchName: CreateGitRefParameters['ref'] } & Pick<CreateGitRefParameters, 'sha'>) => {
    const { data } = await octokit.current.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha,
    })
    return data
  }, [])

  const createPullRequest = useCallback(async (params: {
    title: CreatePullRequestParameters['title']
    body: CreatePullRequestParameters['body']
    head: CreatePullRequestParameters['head']
    base: CreatePullRequestParameters['base']
  }) => {
    const { data } = await octokit.current.rest.pulls.create({
      owner,
      repo,
      ...params,
    })
    return data
  }, [])

  return {
    createGitBlob,
    getGitLatestCommit,
    getGitTree,
    createGitTree,
    createGitCommit,
    createGitBranch,
    createPullRequest,
  }
}

export default useOctokit