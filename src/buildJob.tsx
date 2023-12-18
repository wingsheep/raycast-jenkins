import { Form, Action, ActionPanel, useNavigation, showToast, Icon, Toast } from "@raycast/api"
import { useForm, FormValidation} from "@raycast/utils"
import { useRef, useState, useEffect } from "react"
import { JobItem, StarItem, ParameterDefintion, BuildInfo } from './types'
import { DEPLOY_HOST, FORM_TYPE } from './constants'
import useJenkins from "./useJenkins"
import BuildHistory from "./buildHistory"

export default function BuildJob(
  props: {
    jobItem: JobItem | StarItem, 
    parameters: {
      initialValues: any,
      parameterDefinitions: ParameterDefintion[],
    }
  }) {
  const [parametersDefinitionProperty, setParametersDefinitionProperty] = useState<ParameterDefintion[]>(() => props.parameters.parameterDefinitions)
  const [deployHost, setDeployHost] = useState<string>(() => props.parameters.parameterDefinitions.find((item: ParameterDefintion) => item.name === 'deploy_host')?.defaultParameterValue.value as string)
  const { push, pop } = useNavigation()

  function changeTextField(e: string, name: string) {
    const error = e.length > 0 ? undefined : 'This field is required'
    const index = parametersDefinitionProperty.findIndex(item => item.name === name)
    const newArray = [...parametersDefinitionProperty]
    newArray[index].error = error
    setParametersDefinitionProperty(newArray)
  }
  
  function changeDropDown(e: string, name: string) {
    if (name === 'build_type') {
      if (Object.prototype.hasOwnProperty.call(props.parameters.initialValues, 'deploy_host')) {
        setDeployHost(DEPLOY_HOST[e as keyof typeof DEPLOY_HOST])
      }
    }
  }

  async function handleSubmit(values: any) {
    if (Object.prototype.hasOwnProperty.call(props.parameters.initialValues, 'deploy_host')) {
      values['deploy_host'] = deployHost
    }
    await useJenkins.buildJob(props.jobItem.name, {parameters: values})
    toHistoryBuild()
  }

  function toHistoryBuild() {
    push(<BuildHistory jobName={props.jobItem.name}/>)
  }

  return (
    <Form  
      navigationTitle={`Build Job (${props.jobItem.name})`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Build" icon={Icon.Terminal} onSubmit={handleSubmit} />
          <Action title="Build History" shortcut={{ modifiers: ["cmd", "shift"], key: "h" }} icon={Icon.BulletPoints} onAction={() => toHistoryBuild() } />
        </ActionPanel>
      }
    >
      {
        parametersDefinitionProperty  && parametersDefinitionProperty.map((item: ParameterDefintion) => {
          switch (item.formType) {
            case FORM_TYPE.TextField:
              return <Form.TextField
                key={item.name}
                title={item.name}
                placeholder={item.description}
                info={item.error}
                id={item.name}
                error={item.error}
                defaultValue={item.defaultParameterValue.value as string}
                onChange={(e) => changeTextField(e, item.name)}
                />
                case FORM_TYPE.Dropdown:
                  return <Form.Dropdown
                key={item.name}
                title={item.name}
                info={item.description}
                id={item.name}
                error={item.error}
                defaultValue={item.defaultParameterValue.value as string}
                onChange={(e) =>changeDropDown(e, item.name)}
                >
                {item.options?.map((option) => (
                  <Form.Dropdown.Item key={option.value} value={option.value} title={option.name} />
                ))}
              </Form.Dropdown>
              
            case FORM_TYPE.Checkbox:
              return <Form.Checkbox
                key={item.name}
                title={item.name}
                label={item.description}
                id={item.name}
                defaultValue={item.defaultParameterValue.value as boolean}
              />
            case FORM_TYPE.Description:
              return <Form.Description
                key={item.name}
                title={item.name}
                text={deployHost}
              />
          }
        })
        
      }
    </Form>
  )
}
