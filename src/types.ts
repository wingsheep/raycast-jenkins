import { PARAMETER_TYPE, FORM_TYPE } from './constants'
export interface JobItem {
  name: string
  fullName: string
  url: string
  _class: string
  color: 'blue' | 'red' | 'disabled'
  statusText: string
  statusColor: string
  id: string
  description: string
  hasDetail: boolean
  lastBuild: BuildInfo
  lastFailedBuild: BuildInfo
  lastStableBuild: BuildInfo
  lastSuccessfulBuild: BuildInfo
  lastUnstableBuild: BuildInfo
  lastUnsuccessfulBuild: BuildInfo
  healthReport: {
    description: string,
    score: number
  }[]
  inQueue: boolean
  isStar: boolean
  [key: string]: any
}

export interface BuildInfo {
  url: string
  number: number
  id: string
  color: 'blue' | 'red' | 'disabled'
  building: boolean
  [key: string]: any
}

export interface ViewItem {
  name: string
  url: string
  _class: string
  id: string
}
export interface Info {
  views: ViewItem[]
}


export interface Preference {
  webUrl: string
  username: string
  password: string
}
export interface StarItem {
  name: string
  isStar: boolean
  isFavorite: boolean
  id: string
  hasDetail?: boolean
  [key: string]: any
}


export interface ParameterDefintion {
  _class: string
  defaultParameterValue: {
    _class: string
    name: string,
    value: unknown
  },
  description: string,
  name: string,
  type: keyof typeof PARAMETER_TYPE;
  options?: {name: string, value: string}[]
  formType: FORM_TYPE
  error?: string
  value?: string
}





export interface Queue {
  items: QueueItem[]
}

export interface QueueItem {
  actions: Action[]
  blocked: boolean
  buildable: boolean
  buildableStartMilliseconds: number
  id: number
  inQueueSince: number
  params: string
  stuck: boolean
  task: Task
  url: string
  why: string
}

export interface Action {
  causes: Cause[]
}

export interface Cause {
  shortDescription: string
  userId: any
  userName: string
}

export interface Task {
  color: string
  name: string
  url: string
}
