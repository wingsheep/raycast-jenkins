import React from "react"
import { open, Action, useNavigation, ActionPanel, List, Icon, getPreferenceValues, Clipboard, Color, showToast, Toast, LaunchProps } from "@raycast/api"
import type { JobItem, ViewItem, BuildInfo, StarItem } from "./types"
import useJenkins from "./useJenkins"
import BuildHistory from "./buildHistory"
import BuildJob from "./buildJob"
export default function Command(props: LaunchProps<{ arguments: any }>) {
  const cancelRef = React.useRef<AbortController | null>(null)
  const [jobList, setJobList] = React.useState<JobItem[]>([])
  const [viewList, setViewList] = React.useState<ViewItem[]>([])
  const [starList, setStarList] = React.useState<StarItem[]>([])
  const [currentView, setCurrentView] = React.useState<ViewItem>()
  const [loading, setLoading] = React.useState(false)
  const [navigationTitle] = React.useState<string>(() => {
    return 'Jenkins'
  })
  const [isShowingDetail, setShowingDetail] = React.useState(true)
  const { push, pop } = useNavigation()

  async function getJobDetail(item: JobItem | StarItem) {
    setLoading(true)
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading...",
    })
    setJobItemDetail(item.id, await useJenkins.getJobDetail(item.name))
    setLoading(false)
    toast.hide()
  }

  function setJobItemDetail(id: string, result: JobItem | StarItem) {
    const starIndex = starList.findIndex(item => id === item.id)
    if (starIndex !== -1) {
      starList[starIndex] = {
        ...starList[starIndex],
        ...result,
        hasDetail: true,
      }
      setStarList([...starList])
    } else {
      const index = jobList.findIndex(item => id === item.id)
      if (index === -1) return
      jobList[index] = {
        ...jobList[index],
        ...result,
        hasDetail: true,
      }
      setJobList([...jobList])
    }
  }
  async function initData() {
    setLoading(true)
    setStarList(await useJenkins.getStarList())
    setViewList(await useJenkins.getViewList())
    setJobList(await useJenkins.getViewJobs())
    setLoading(false)
  }
  React.useEffect(() => {
    initData()
    return () => {   
      cancelRef.current?.abort()
    }
  }, [])

  const onSelectionChange = async (id: string | null) => {
    const list = [...starList, ...jobList]
    const findItem = list.find(item => item.id === id)
    if (findItem && findItem.hasDetail) return
    findItem && await getJobDetail(findItem)
  }
  function TagListPane(item: JobItem | StarItem, key: string, text: string) {
    const buildInfo: BuildInfo= item[key]
    return buildInfo &&(
      <List.Item.Detail.Metadata.TagList title={text}>
        <List.Item.Detail.Metadata.TagList.Item
          text={'#' + buildInfo.number}
          color={Color.SecondaryText}
          onAction={() => {
            open(buildInfo.url, "com.google.Chrome")
          }}
        />
      </List.Item.Detail.Metadata.TagList>
    )
  }

  // detail面板
  function DetailPane(item: JobItem | StarItem) {
    return (
      <List.Item.Detail
        metadata={
          item.fullName && <List.Item.Detail.Metadata>
            {item.fullName && <List.Item.Detail.Metadata.Label title="Full Name" text={item.fullName} />}
            {item.description && <List.Item.Detail.Metadata.Label title="Description" text={item.description} />}
            <List.Item.Detail.Metadata.TagList title="InQueue">
              <List.Item.Detail.Metadata.TagList.Item
                text={item.inQueue?.toString()}
                color={item.inQueue ? Color.Red : Color.SecondaryText}
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Separator />
            {item.healthReport && <List.Item.Detail.Metadata.Label title="Health Score" text={item.healthReport[0].score.toString()} />}
            {item.healthReport && <List.Item.Detail.Metadata.Label title="Health Report" text={item.healthReport[0].description} />}
            <List.Item.Detail.Metadata.Separator />
            {TagListPane(item, 'lastBuild', 'Last Build')}
            {TagListPane(item, 'lastStableBuild', 'Recent Stable Build')}
            {TagListPane(item, 'lastFailedBuild', 'Recent Failed Build')}
            {TagListPane(item, 'lastSuccessfulBuild', 'Recent Successful Build')}
            {TagListPane(item, 'lastUnstableBuild', 'Last Unstable Build')}
            {TagListPane(item, 'lastUnsuccessfulBuild', 'Recent Unsuccessful Build')}
          </List.Item.Detail.Metadata>
        }
      />
    )
  }
  const onViewTypeChange = async (id: string) => {
    const selectView = viewList.find(item => item.id === id)
    setCurrentView(selectView)
    if (selectView?._class === 'hudson.model.AllView') {
      setJobList(await useJenkins.getViewJobs())
    } else {
      setJobList(await useJenkins.getViewJobs(selectView?.name))
    }
  }
  
  function toggleShowDetail() {
    setShowingDetail(!isShowingDetail)
  }
  function ViewDropdown(props: { onViewTypeChange: (newValue: string) => void }) {
    const { onViewTypeChange } = props
    return (
      <List.Dropdown
        tooltip="Select View"
        storeValue={true}
        onChange={(newValue) => {
          onViewTypeChange(newValue)
        }}
      >
        <List.Dropdown.Section>
          {viewList.map((view) => (
            <List.Dropdown.Item key={view.id} title={view.name} value={view.id} />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    )
  }
  function toHistoryBuild(job: JobItem | StarItem) {
    if (loading) return
    push(<BuildHistory jobName={job.name} />)
  }
  function toBuildJob(job: JobItem | StarItem) {
    if (loading) return
    const parameters = useJenkins.handleParametersDefinitionProperty(job.property)
    push(<BuildJob jobItem={job}  parameters={parameters} />)
  }

  function ActionDetail(job: JobItem | StarItem) {
    return (  
      <ActionPanel>
          { !loading && <Action title="Build Job" shortcut={{ modifiers: ["cmd", "shift"], key: "b" }} icon={Icon.Building} onAction={() => toBuildJob(job) } /> }
          { job.isStar && <Action title="Cancel Favorite" shortcut={{ modifiers: ["cmd", "shift"], key: "d" }} icon={Icon.StarDisabled} onAction={() => toggleStar(job) } /> }
          { !job.isStar && <Action title="Add Favorite" shortcut={{ modifiers: ["cmd", "shift"], key: "d" }} icon={Icon.Star} onAction={() => toggleStar(job) } /> }
          <Action.OpenInBrowser title="Open in Browser" shortcut={{ modifiers: ["cmd"], key: "return" }}  url={job.url} />
          <Action title="Refresh" shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} icon={Icon.Repeat} onAction={() => getJobDetail(job) } />
          <Action title="Toggle Detail" shortcut={{ modifiers: ["cmd", "shift"], key: "t" }} icon={Icon.BulletPoints} onAction={() => toggleShowDetail() } />
          { !loading &&<Action title="Build History" shortcut={{ modifiers: ["cmd", "shift"], key: "h" }} icon={Icon.BulletPoints} onAction={() => toHistoryBuild(job) } /> }
      </ActionPanel>
    )
  }
  async function toggleStar(jobItem: JobItem | StarItem) {
    setStarList(await useJenkins.toggleStar(jobItem.name))
  }
  return (
    <List
      filtering={true}
      isLoading={loading}
      searchBarPlaceholder="Please enter keyword to filter..."
      navigationTitle={navigationTitle}
      throttle
      isShowingDetail={isShowingDetail}
      onSelectionChange={onSelectionChange}
      searchBarAccessory={<ViewDropdown  onViewTypeChange={onViewTypeChange} />}
    >
      <List.Section title="FAVORITE">
        {
          starList.map(star => (
            <List.Item 
              key={star.id}
              id={star.id}
              title={star.name}
              detail={DetailPane(star)}
              actions={ActionDetail(star)}
            />
          ))
        }
      </List.Section>
      <List.Section title={currentView?.name.toLocaleUpperCase()}>
        {jobList.map((job) => (
          <List.Item
            key={job.id}
            id={job.id}
            title={job.name}
            subtitle={job.statusText}
            icon={{source: Icon.CircleFilled, tintColor: job.statusColor}}
            detail={DetailPane(job)}
            actions={ActionDetail(job)}
          />
        ))}
      </List.Section>
    </List>
  )
}
