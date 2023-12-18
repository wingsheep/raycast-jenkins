export enum COLOR_ALIAS  {
  "blue" = "Green",
  "red" = "Red",
  "disabled" = "SecondaryText",
  "aborted" = "Yellow",
}

export enum COLOR_STATUS_ALIAS  {
  "blue" = "success",
  "red" = "fail",
  "disabled" = "disabled",
  "aborted" = "aborted",
}


export const STAR_KEY = "starred-jobs"


export enum PARAMETER_TYPE {
  "StringParameterDefinition",
  "ChoiceParameter",
  "CascadeChoiceParameter",
  "BooleanParameterDefinition",
}

export enum BUILD_TYPE {
  "dev" = "开发环境",
  "beta" = "测试环境",
  "uat" = "预发布环境",
  "prod" = "生产环境",
}

export enum BUILD_TOOL {
  "npm" = "npm",
  "yarn" = "yarn",
  "pnpm" = "pnpm",
}


export enum DEPLOY_HOST {
  "dev" = "static_dev",
  "beta" = "static_beta",
  "uat" = "static_uat",
  "prod" = "static_prod",
}

export enum BOOLEAN {
  'true' = "是",
  'false' = "否",
}

export enum FORM_TYPE {
  'TextField',
  'PasswordField',
  'TextArea',
  'Checkbox',
  'DatePicker',
  'Dropdown',
  'FilePicker',
  'Description',
}
export const PROPERTY_CLASS = 'hudson.model.ParametersDefinitionProperty'
