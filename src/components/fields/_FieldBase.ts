import { Component, Prop, Watch } from "vue-property-decorator"
import BaseClass from "src/BaseClass"
import { I_ExtraFields } from "src/interfaces/I_Blueprint"

@Component
export default class FieldBase extends BaseClass {
  /****************************************************************/
  // BASIC FIELD DATA
  /****************************************************************/

  /**
   * Blueprint data for the specific field
   */
  @Prop({ default: [] }) readonly inputDataBluePrint!: I_ExtraFields

  /**
   * Determines if the document is curently in edit mode or not
   */
  @Prop() readonly editMode!: boolean

  /**
   * Field icon defined in the blueprint
   */
  get inputIcon () {
    return this.inputDataBluePrint?.icon
  }

  /**
   * Field tooltip defined in the blueprint
   */
  get toolTip () {
    return this.inputDataBluePrint?.tooltip
  }

  /****************************************************************/
  // LOCAL SETTINGS
  /****************************************************************/

  /**
   * React to changes on the options store
   */
  @Watch("SGET_options", { immediate: true, deep: true })
  onSettingsChange () {
    this.isDarkMode = this.SGET_options.darkMode
    this.disableDocumentToolTips = this.SGET_options.disableDocumentToolTips
    this.textShadow = this.SGET_options.textShadow
  }

  /**
   * Determines if the text has shadows or not
   */
  textShadow = false

  /**
   * Determines if this is in dark-mode or not
   */
  isDarkMode = false

  /**
   * Determines if the tooltips should be disabled or not
   */
  disableDocumentToolTips = false
}
