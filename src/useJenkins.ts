import Jenkins from "jenkins"
import { getPreferenceValues, LocalStorage } from "@raycast/api"
import { COLOR_ALIAS, COLOR_STATUS_ALIAS, STAR_KEY } from './constants'
import { v4 as uuidv4 } from 'uuid'
import url from 'url'
import type { JobItem, ViewItem, Preference, BuildInfo, ParameterDefintion } from "./types"
import { PROPERTY_CLASS, PARAMETER_TYPE, BUILD_TYPE, DEPLOY_HOST, BUILD_TOOL, FORM_TYPE } from './constants'
const preferences = getPreferenceValues<Preference>()
const JENKINS_URL = preferences.webUrl
const JENKINS_HOST = url.parse(JENKINS_URL).host
const JENKINS_USERNAME = preferences.username
const JENKINS_PASSWORD = preferences.password
const JENKINS_BASEURL =  `http://${JENKINS_USERNAME}:${JENKINS_PASSWORD}@${JENKINS_HOST}`
const jenkins = new Jenkins({
  baseUrl: JENKINS_BASEURL
})

/**
 * 获取jenkins分类列表
 * @return {*} 
 */
export async function getViewList() {
  const viewList: ViewItem[] = await jenkins.view.list()
  return viewList.map(item => {
    return {
      ...item,
      id: uuidv4()
    }
  })
}

/**
 * 获取jenkins分类下的job列表
 * @param {string} name
 * @return {*} 
 */
export async function getViewJobs(name = '') {
  const starList = await getStarList()
  let jobList: JobItem[] = []
  if (name) {
    const list = await jenkins.view.get(name) 
    jobList = list.jobs
  } else {
    jobList = await jenkins.job.list()
  }
  return jobList.map(item => {
    return {
      ...item,
      isStar: starList.findIndex(_ => _.name === item.name) !== -1,
      statusColor: COLOR_ALIAS[item.color],
      statusText: COLOR_STATUS_ALIAS[item.color],
      id: uuidv4()
    }
  })
}

/**
 * 获取job详情
 * @param {string} name
 * @return {*} 
 */
export async function getJobDetail(name: string) {
  return await jenkins.job.get(name)
}

/**
 * 切换收藏
 * @param {string} jobName
 * @return {*} 
 */
export async function toggleStar(jobName: string) {
  const starList = await getStarList()
  // 判断starList中是否存在, 存在则删除，不存在则添加至第一个
  const index = starList.findIndex(item => item.name === jobName) 
  if (index !== -1) {
    starList.splice(index, 1)
  } else {
    starList.unshift({
      name: jobName,
      isStar: true,
      isFavorite: true,
      id: uuidv4(),
    })
  }
  await LocalStorage.setItem(STAR_KEY, starList.map(item => item.name).join(','))
  return starList
}
/**
 * 获取收藏列表
 * @export
 * @return {*} 
 */
export async function getStarList() {
  const starListString = await LocalStorage.getItem<string>(STAR_KEY) 
  const starList = starListString ? starListString.split(',') : []
  return starList.map(item => {
    return {
      name: item,
      isStar: true,
      isFavorite: true,
      id: uuidv4()
    }
  })
}

export function handleBuilds(builds: BuildInfo[]) {
  return builds.map(item => {
    return {
      ...item,
      id: uuidv4(),
    }
  })
}

/**
 * 获取jenkins队列详情
 * @return {*} 
 */
export async function getQueueItem(number: number) {
  return await jenkins.queue.item(number)
}
/**
 * 获取jenkins队列列表
 * @return {*} 
 */
export async function getQueueList() {
  return await jenkins.queue.list()
}

export async function cancelQueue(queueId: number) {
  return await jenkins.queue.cancel(queueId)
}

export async function buildJob(jobName: string, parameters = {}) {
  return await jenkins.job.build(jobName, parameters)
}

export async function killJob(jobName: string, jobNumber: number) {
  return await jenkins.build.stop(jobName, jobNumber)
}

export async function getBuildLog(jobName: string, jobNumber: number) {
  const log = await jenkins.build.log(jobName, jobNumber)
  return log
}

export async function getBuildLogSteam(jobName: string, jobNumber: number) {
  return await jenkins.build.logStream(jobName, jobNumber) 
}

export async function getBuildInfo(jobName: string, buildNumber: number) {
  return await jenkins.build.get(jobName, buildNumber)
}

export function handleParametersDefinitionProperty(property = <any>[]) {
  const initialValues: any = {}
  const data = property.find((item: ParameterDefintion) => item._class === PROPERTY_CLASS)
    data.parameterDefinitions?.map((item: ParameterDefintion) => {
      if (item.name === 'build_type') {
        item.formType = FORM_TYPE.Dropdown
        item.options = Object.keys(BUILD_TYPE).map((key) => {
          const name = BUILD_TYPE[key as keyof typeof BUILD_TYPE]
          return {
            name: `${name}(${key})`,
            value: key
          }
        })
      } else if (item.name === 'deploy_host') {
        item.formType = FORM_TYPE.Description
        item.options = Object.keys(DEPLOY_HOST).map((key) => {
          return {
            name: DEPLOY_HOST[key as keyof typeof DEPLOY_HOST],
            value: key
          }
        })
        item.defaultParameterValue.value = DEPLOY_HOST[item.options[0].value as keyof typeof DEPLOY_HOST]
      } else if (item.name === 'build_tool') {
        item.formType = FORM_TYPE.Dropdown
        item.options = Object.keys(BUILD_TOOL).map((key) => {
          return {
            name: key,
            value: key
          }
        })
      } else if (item.type === PARAMETER_TYPE[PARAMETER_TYPE.BooleanParameterDefinition]) {
        item.formType = FORM_TYPE.Checkbox
      } else if (item.type === PARAMETER_TYPE[PARAMETER_TYPE.StringParameterDefinition]) {
        item.formType = FORM_TYPE.TextField
      }
      initialValues[item.name] = item.defaultParameterValue.value || ' '
    })
    return{
      initialValues,
      parameterDefinitions: data.parameterDefinitions as ParameterDefintion[] 
    } 
}
export default {
  getViewList,
  getViewJobs,
  getJobDetail,
  toggleStar,
  getStarList,
  handleBuilds,
  getQueueItem,
  getQueueList,
  buildJob,
  getBuildLog,
  getBuildLogSteam,
  getBuildInfo,
  handleParametersDefinitionProperty,
  cancelQueue,
  killJob,
}
