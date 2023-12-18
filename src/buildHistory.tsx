import React, { useEffect } from "react";
import { Toast, showToast, Action, ActionPanel, Color, List, Icon } from "@raycast/api";
import type {  QueueItem, BuildInfo } from "./types"
import useJenkins from "./useJenkins"
import dayjs from 'dayjs'

export default function BuildHistory(props: { jobName: string }) {
  const [buildList, setBuildList] = React.useState<BuildInfo[]>([])
  const [queue, setQueue] = React.useState<QueueItem[]>([])
  const [detailInfo, setDetailInfo] = React.useState<BuildInfo | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [markdown, setMarkdown] = React.useState('')

  let defaultNumber = 0
  let clearTimer: any = undefined
  let logStream: any  = null
    
  useEffect(() => {  
    initData()
    return () => {
      clearTimer && clearTimer()
    }
  }, [])


  function customInterval(callback: () => Promise<void>, delay: number) {
    let timerId: NodeJS.Timeout= setTimeout(async function tick() {
      await callback()
      timerId = setTimeout(tick, delay);
    }, delay);
    return function clearTimer() {
      clearTimeout(timerId);
    };
  }

  async function getBuilds() {
    const jobInfo = await useJenkins.getJobDetail(props.jobName)
    return useJenkins.handleBuilds(jobInfo.builds)
  }

  async function getQueue() {
     return await useJenkins.getQueueList()
  }
  function resetData() {
    defaultNumber = 0
    clearTimer && clearTimer()
    clearTimer = undefined
    logStream  = null
  }
  async function initData() {
    resetData()
    const result = await getBuilds()
    setQueue(await getQueue())
    setBuildList(result)
    defaultNumber = result && result.length && result[0].number
    clearTimer = customInterval(async() => {
      const result = await getBuilds()
      setQueue(await getQueue())
      const number = result && result.length && result[0].number
      if (defaultNumber !== number) {
        defaultNumber = number
        setBuildList(result)
      }
    }, 5000)
  }

  async function pipeLogStreamMarkdown(findItem: BuildInfo) {
    const logStream = await useJenkins.getBuildLogSteam(props.jobName, findItem.number)
    let content = ''
    logStream.on("data", (stream: string) => {
      const lines = stream.split('\n');
      let text = ''
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].replaceAll('>', '=>')
        line = line.replaceAll('+', '=>')
        text += `\n${line}\n`
      }
      content += text
      setMarkdown(content)
    })

    logStream.on("error", (err: any) => {
      console.log("error", err)
    })
    
    logStream.on("end", async () => {
      const detailInfo = await useJenkins.getBuildInfo(props.jobName, findItem.number)
      findItem.detailInfo = detailInfo
      setDetailInfo(detailInfo)
      await showToast({
        style: Toast.Style.Success,
        title: `Build End: ${props.jobName} #${findItem.number}`,
      })
    })
    return logStream
  }

  async function getBuildLog(buildNumber: number) {
    const logInfo = await useJenkins.getBuildLog(props.jobName, buildNumber)
    const lines = logInfo.split('\n');
    let text = ''
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replaceAll('>', '=>')
      line = line.replaceAll('+', '=>')
      text += `\n${line}\n`
    }
    setMarkdown(text)
  }

  function resetDetail() {
    logStream && logStream.end()
    setMarkdown('')
    setDetailInfo(null)
  }

  const onSelectionChange = async (id: string | null) => {
    const findQueueItem = queue?.find((item: QueueItem) => item.id.toString() === id)
    if (findQueueItem) return
    const findItem = buildList.find(item => item.id === id)
    resetDetail()
    setLoading(true)
    const detailInfo = findItem && await useJenkins.getBuildInfo(props.jobName, findItem.number)
    if (detailInfo) {
      findItem.detailInfo = detailInfo
      setDetailInfo(detailInfo)
      if (detailInfo.building) {
        logStream = pipeLogStreamMarkdown(findItem)
      } else {
        getBuildLog(findItem.number)
      }
    }
    setLoading(false)
  }

  async function cancelBuildJob(item: BuildInfo) {
    setLoading(true)
    await useJenkins.killJob(props.jobName, item.number)
    const detailInfo = await useJenkins.getBuildInfo(props.jobName, item.number)
    setDetailInfo(detailInfo)
    item.detailInfo = detailInfo
    setQueue(await getQueue())
    setLoading(false)
    await showToast({
      style: Toast.Style.Success,
      title: "Cancel Build Success",
    })
  }
  async function reBuildJob(item: BuildInfo) {
    setLoading(true)
    const values: any = {}
    item.actions.find((item: any) => item._class === 'hudson.model.ParametersAction').parameters.map((item: any) => {
      values[item.name] = item.value
    })
    await useJenkins.buildJob(props.jobName, {parameters: values})
    await initData()
    setLoading(false)
  }


  function BuildActionPane(item: BuildInfo) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          { item.detailInfo?.building && <Action title="Cancel Build" icon={Icon.XMarkCircle} onAction={() =>cancelBuildJob(item.detailInfo)} /> }
          { item.detailInfo && <Action title="Rebuild" icon={Icon.XMarkCircle} onAction={() => reBuildJob(item.detailInfo)} /> }
          { item.url &&<Action.OpenInBrowser url={item.url} /> }
        </ActionPanel.Section>
      </ActionPanel>
    )
  }
  
  function QueueDetailPane(item: QueueItem) {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Id" text={item.id.toString()} />
            <List.Item.Detail.Metadata.Label title="Url" text={item.url} />
            <List.Item.Detail.Metadata.Label title="Buildable Start Milliseconds" text={dayjs(item.buildableStartMilliseconds).format('YYYY-MM-DD HH:mm:ss')} />
            <List.Item.Detail.Metadata.Label title="In Queue Since" text={dayjs(item.inQueueSince).format('YYYY-MM-DD HH:mm:ss')} />
            <List.Item.Detail.Metadata.Separator />
            {item.actions?.find((item) => item.causes)?.causes.map((item: any, index) => {
              return (
                <List.Item.Detail.Metadata.Label
                  key={item.userId + index}
                  title={`Cause Action ${index}`}
                  text={item.shortDescription}
                />
              )
            })}
          </List.Item.Detail.Metadata>
        }
      />
    )
  }

  async function cancelQueue(id: number) {
    await useJenkins.cancelQueue(id)
    setQueue(await getQueue())
    await showToast({
      style: Toast.Style.Success,
      title: "Cancel Queue Success",
    })
  }

  function QueueActionPane(item: QueueItem) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          { <Action title="Cancel Queue" icon={Icon.XMarkCircle} onAction={() =>cancelQueue(item.id)} /> }
          { item.url &&<Action.OpenInBrowser url={item.url} /> }
        </ActionPanel.Section>
      </ActionPanel>
    )
  }
  function BuildDetailPane() {
    return (
      <List.Item.Detail
        markdown={markdown}
        metadata={
          detailInfo && <List.Item.Detail.Metadata>
            {detailInfo.result && <List.Item.Detail.Metadata.TagList title="Result">
              <List.Item.Detail.Metadata.TagList.Item
                text={detailInfo.result}
                color={detailInfo.result === 'SUCCESS' ? Color.Green : Color.Red}
              />
            </List.Item.Detail.Metadata.TagList>}
            {
            <List.Item.Detail.Metadata.TagList title="Building">
              <List.Item.Detail.Metadata.TagList.Item
                text={detailInfo.building?.toString()}
                color={detailInfo.building ? Color.Red : Color.SecondaryText}
              />
            </List.Item.Detail.Metadata.TagList>
            }
            <List.Item.Detail.Metadata.Separator />
            {
              detailInfo.actions && detailInfo.actions.find((item: any) => item._class === 'hudson.model.ParametersAction').parameters.map((item: any) => {
                return <List.Item.Detail.Metadata.Label key={item.name} title={item.name} text={item.value.toString()} />
              })
            }
            <List.Item.Detail.Metadata.Separator />
           <List.Item.Detail.Metadata.Label title="Built ON" text={detailInfo.builtOn} />
           <List.Item.Detail.Metadata.Label title="Timestamp" text={dayjs(detailInfo.timestamp).format('YYYY-MM-DD HH:mm:ss')} />
          </List.Item.Detail.Metadata>
        }
      >
      </List.Item.Detail>
    )
  }
  return (
    <List
      isLoading={loading}
      isShowingDetail={true}
      searchBarPlaceholder="Please enter keyword to filter..."
      navigationTitle={`Build History(${props.jobName})`}
      throttle
      onSelectionChange={onSelectionChange}

    >
      <List.Section title="Queue">
          {queue && queue?.map(item => {
            return <List.Item
              key={item.id}
              id={item.id.toString()}
              title={'#' + item.id}
              actions={QueueActionPane(item)}
              detail={QueueDetailPane(item)}
            />
          }) }
      </List.Section>
      <List.Section title="History Builds">
        {buildList.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            title={'#' +item.number}
            subtitle={item.detailInfo?.building ? 'BUILDING' : item.detailInfo?.result.toString()}
            icon={item.detailInfo?.building ? {
              source: Icon.CircleProgress25,
              tintColor: Color.Yellow
            } : item.detailInfo?.result === 'SUCCESS' ? {
              source: Icon.CheckCircle,
              tintColor: Color.Green
            } :  item.detailInfo?.result ? {
              source: Icon.XMarkCircle,
              tintColor: Color.Red
            } : {
              source: Icon.Dot,
              tintColor: Color.SecondaryText
            }}
            actions={BuildActionPane(item)}
            detail={BuildDetailPane()}
          />
        ))}
      </List.Section>
    </List>
  )
} 
