<template>
  <div>
    <div class="flex justify-start items-center text-weight-bolder q-mb-sm q-mt-md">
      <q-icon v-if="inputIcon" :name="inputIcon" :size="inputIcon.includes('fas')? '15px': '20px'" class="q-mr-md"/>
      {{inputDataBluePrint.name}}
       <q-icon v-if="toolTip && !disableDocumentToolTips" name="mdi-help-circle" size="16px" class="q-ml-md">
         <q-tooltip :delay="500">
           <span v-html="toolTip"/>
        </q-tooltip>
      </q-icon>
      <q-icon v-if="isOneWayRelationship" name="mdi-arrow-right-bold" size="16px" class="q-ml-md">
         <q-tooltip :delay="500" v-if="!disableDocumentToolTips">
          This is a one-way relationship. <br> Editing this value <span class="text-secondary">WILL NOT</span> have any effect on the connected document/s.
          <br>
          <br>
          Left-clicking the linked document in non-edit mode will open it in new tab and focuses on it.
          <br>
          Middle-clicking the linked document in non-edit mode will open it in new tab and not focus on it.
        </q-tooltip>
      </q-icon>
      <q-icon v-if="!isOneWayRelationship" name="mdi-arrow-left-right-bold" size="16px" class="q-ml-md">
         <q-tooltip :delay="500" v-if="!disableDocumentToolTips">
          This is a two-way relationship. <br> Editing this value <span class="text-secondary">WILL</span> also affect the connected document/s.
          <br>
          <br>
          Left-clicking the linked document in non-edit mode will open it in new tab and focuses on it.
          <br>
          Middle-clicking the linked document in non-edit mode will open it in new tab and not focus on it.
        </q-tooltip>
      </q-icon>
    </div>

    <q-list
      v-if="!editMode && localInput"
      class="connectionList"
      dense>
      <q-item
      clickable
      class="text-primary"
      >
        <q-item-section
          @click.left="openExistingDocumentRoute(localInput)"
          @click.middle="openNewTab(localInput)"
          >
          <span class="text-weight-medium">
           {{stripTags(localInput.label)}}
          </span>
          <span class="inline-block q-ml-xs text-italic connectionNote">
            {{retrieveNoteText()}}
          </span>
          <q-btn
            tabindex="-1"
            round
            flat
            dense
            dark
            color="primary"
            icon="mdi-open-in-new"
            size="12px"
            class="relationshipOpeningButton"
            @click.stop.prevent.left="openNewTab(localInput)"
            >
            <q-tooltip :delay="500">
              Open in new tab without leaving this one
            </q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

  <div class="flex" v-if="editMode">
    <q-select
      class="singleRelashionshipSelect"
      menu-anchor="bottom middle"
      menu-self="top middle"
      dark
      style="flex-grow: 1;"
      dense
      :ref="`singleRelationshipField${inputDataBluePrint.id}`"
      :options="filterList"
      use-input
      :outlined="!isDarkMode"
      :filled="isDarkMode"
      input-debounce="200"
      v-model="localInput"
      @filter="filterSelect"
      @input="signalInput(false)"
    >
      <template v-slot:selected-item="scope">
        <q-chip
          v-if="scope.opt.label && scope.opt.label.length > 0"
          removable
          dense
          @click="openNewTab(scope.opt)"
          @remove="scope.removeAtIndex(scope.index)"
          :tabindex="scope.tabindex"
          color="accent"
          text-color="dark"
          class="text-bold"
        >
          {{ stripTags(scope.opt.label) }}
          <q-btn
            round
            dense
            flat
            class="z-max"
            style="color: #000 !important;"
            size="sm"
            icon="mdi-open-in-new"
            @click.stop.prevent="openNewTab(scope.opt)"
          >
           <q-tooltip :delay="500">
              Open in new tab without leaving this one
            </q-tooltip>
          </q-btn>
        </q-chip>
        </template>

      <template v-slot:option="{ itemProps, itemEvents, opt }">
          <q-item
            :class="{'hasTextShadow': textShadow}"
            v-bind="itemProps"
            v-on="itemEvents"
          >
            <q-item-section avatar>
              <q-icon
                :style="`color: ${retrieveIconColor(opt)}`"
                :name="(opt.isCategory) ? 'fas fa-folder-open' : opt.icon"
                />
            </q-item-section>
            <q-item-section>
              <q-item-label
              :style="`color: ${opt.color}`"
               v-html="opt.label" ></q-item-label>
              <q-item-label caption class="text-cultured" v-html="opt.hierarchicalPath"></q-item-label>
              <q-item-label caption class="text-cultured" v-if="opt.tags">
                <q-chip
                v-for="(input,index) in opt.tags" :key="index"
                outline
                style="opacity: 0.8;"
                size="12px"
                class="text-cultured noBounce"
                v-html="`${input}`"
                >
                </q-chip>
              </q-item-label>
            </q-item-section>
            <q-tooltip v-if='opt.disable'>
              This option is unavailable for selection as it is already paired to another.
            </q-tooltip>
          </q-item>
        </template>
    </q-select>

     <table class="q-mt-sm" v-if="localInput && inputFieldID !== 'parentDoc'">
      <tr>
        <td>
          {{stripTags(localInput.label)}}
        </td>
        <td>
          <q-input
            label="Note"
            v-model="inputNote.value"
            dense
            @keyup="signalInput(false)"
            :outlined="!isDarkMode"
            :filled="isDarkMode"
            >
          </q-input>
        </td>

      </tr>
    </table>

  </div>

    <div class="separatorWrapper">
      <q-separator color="grey q-mt-md" />
    </div>

  </div>

</template>

<script lang="ts">
import { Component, Emit, Prop, Watch } from "vue-property-decorator"

import FieldBase from "src/components/fields/_FieldBase"

import PouchDB from "pouchdb"
import { advancedDocumentFilter } from "src/scripts/utilities/advancedDocumentFilter"
import { extend } from "quasar"

import { I_ShortenedDocument } from "src/interfaces/I_OpenedDocument"
import { I_FieldRelationship, I_RelationshipPairSingle } from "src/interfaces/I_FieldRelationship"

@Component({
  components: { }
})
export default class Field_SingleRelationship extends FieldBase {
  /****************************************************************/
  // BASIC FIELD DATA
  /****************************************************************/

  /**
   * Already existing value in the input field (IF one is there right now)
   */
  @Prop({ default: "" }) readonly inputDataValue!: I_RelationshipPairSingle

  /**
   * ID of the document this field belongs to
   */
  @Prop({ default: "" }) readonly currentId!: ""

  /**
   * Current field ID
   * This is used for special handling of the "parentDoc" field used for hiearachical pathing
   */
  get inputFieldID () {
    return this.inputDataBluePrint?.id
  }

  /**
   * Determines if this is a one or two way relationship
   */
  get isOneWayRelationship () {
    return (this.inputDataBluePrint.type === "singleToNoneRelationship" || this.inputDataBluePrint.type === "manyToNoneRelationship")
  }

  /****************************************************************/
  // INPUT HANDLING
  /****************************************************************/

  /**
   * Watch changes to the prefilled data already existing in the field and update local input accordingly
   * Also reload the local object list
   */
  @Watch("inputDataValue", { deep: true, immediate: true })
  reactToInputChanges () {
    // @ts-ignore
    this.localInput = (this.inputDataValue?.value) ? this.inputDataValue.value : ""

    this.inputNote = (!this.inputDataValue?.addedValues) ? this.inputNote : this.inputDataValue.addedValues

    this.reloadObjectListAndCheckIfValueExists().catch(e => console.log(e))
  }

  /**
   * Reload the local object list based on blueprint changes
   */
  @Watch("inputDataBluePrint", { deep: true, immediate: true })
  reactToBlueprintChanges () {
    this.reloadObjectListAndCheckIfValueExists().catch(e => console.log(e))
  }

  /**
   * Reload the local object list based on current document ID changes
   */
  @Watch("currentId")
  reactToIDChanges () {
    this.reloadObjectListAndCheckIfValueExists().catch(e => console.log(e))
  }

  /**
   * Model for the local input
   */
  localInput = "" as unknown as I_FieldRelationship

  /**
   * A note paired to the local input
   */
  inputNote: { pairedId: string; value: string; } = {
    pairedId: "",
    value: ""
  }

  /**
   * Retrieves note text
   */
  retrieveNoteText () {
    const pairedNote = this.inputNote
    return (pairedNote && pairedNote.value.length > 0) ? `(${pairedNote.value})` : ""
  }

  /**
   * A list of all retrieved documents without the current one
   */
  allDocumentsWithoutCurrent: I_ShortenedDocument[] = []

  /**
   * A copy of the list for the filter feed
   * A copy is needed here as the list gets modified as the filter returns highlights and similar
   */
  filterList: I_ShortenedDocument[] = []

  /**
   * Refocus after filtering to avoid un-intuitive focusing
   */
  async refocusSelect () {
    await this.$nextTick()
    /*eslint-disable */
    // @ts-ignore 
    this.$refs[`singleRelationshipField${this.inputDataBluePrint.id}`].setOptionIndex(-1)
    // @ts-ignore 
    this.$refs[`singleRelationshipField${this.inputDataBluePrint.id}`].moveOptionSelection(1, true) 
    /* eslint-enable */
  }

  /**
   * Filter the document list
   */
  filterSelect (val: string, update: (e: () => void) => void) {
    if (val === "") {
      update(() => {
        this.filterList = this.allDocumentsWithoutCurrent

        if (this.$refs[`singleRelationshipField${this.inputDataBluePrint.id}`] && this.filterList.length > 0) {
          this.refocusSelect().catch(e => console.log(e))
        }
      })
      return
    }

    update(() => {
      const needle = val.toLowerCase()
      this.filterList = extend(true, [], this.allDocumentsWithoutCurrent)
      // @ts-ignore
      this.filterList = advancedDocumentFilter(needle, this.filterList, this.SGET_allBlueprints, this.filterList)

      if (this.$refs[`singleRelationshipField${this.inputDataBluePrint.id}`] && this.filterList.length > 0) {
        this.refocusSelect().catch(e => console.log(e))
      }
    })
  }

  /**
   * Prepares the initial loading of the list for filtering and furhter use
   * Also remove the document itself from the list, checks if connected input fields even exist and altogether formats and clears the list
   */
  async reloadObjectListAndCheckIfValueExists () {
    if (this.inputDataBluePrint?.relationshipSettings && this.currentId.length > 0) {
      // Get a list of all objects connected to this field and remap them
      const CurrentObjectDB = new PouchDB(this.inputDataBluePrint.relationshipSettings.connectedObjectType)
      let allDbObjects = (await CurrentObjectDB.allDocs({ include_docs: true })).rows.map(doc => doc.doc)

      // Map all of the documents to something more digestible for the select
      let allObjects = allDbObjects.map((doc) => {
        const objectDoc = doc as unknown as I_ShortenedDocument

        const pairedField = (this.inputDataBluePrint?.relationshipSettings?.connectedField) || ""
        let isDisabled = false

        // If the paired field exists and if this is "singleToSingleRelationship", set it as disabled since it is already paired
        if (pairedField.length > 0) {
          const pairedFieldObject = objectDoc.extraFields.find(f => f.id === pairedField)
          const pairingType = this.inputDataBluePrint.type

          if (pairedFieldObject !== undefined && typeof pairedFieldObject?.value !== "string" && pairedFieldObject?.value !== null && pairingType === "singleToSingleRelationship") {
            isDisabled = true
          }
        }

        return {
          _id: objectDoc._id,
          value: objectDoc._id,
          type: objectDoc.type,
          icon: objectDoc.icon,
          disable: isDisabled,
          extraFields: objectDoc.extraFields,
          url: `/project/display-content/${objectDoc.type}/${objectDoc._id}`,
          label: objectDoc.extraFields.find(e => e.id === "name")?.value,
          color: objectDoc.extraFields.find(e => e.id === "documentColor")?.value,
          isCategory: objectDoc.extraFields.find(e => e.id === "categorySwitch")?.value,
          pairedField: pairedField,
          tags: objectDoc.extraFields.find(e => e.id === "tags")?.value,
          // @ts-ignore
          hierarchicalPath: this.getDocumentHieararchicalPath(objectDoc, allDbObjects)
        }
      }) as unknown as I_ShortenedDocument[]

      // If this is the "parentDoc" field, include categories, otherwise, filter them out from the list
      const isBelongsUnder = (this.inputDataBluePrint.id === "parentDoc")
      const objectsWithoutCurrent: I_ShortenedDocument[] = (isBelongsUnder)
        ? allObjects.filter((obj) => obj._id !== this.currentId)
        : allObjects.filter((obj) => obj._id !== this.currentId).filter((obj) => !obj.isCategory)

      // Proceed only if the local input is properly set up
      if (this.localInput._id) {
        // If the matched object doesn't exist in the object, assume it has been deleted or newer existed and silently emit a signal input which auto-updates the document
        if (!objectsWithoutCurrent.find(e => e._id === this.localInput._id)) {
          // @ts-ignore
          this.localInput = ""
          this.signalInput(true)
        }
        // If the object does exist, make sure we have the newest available name by reasigning the label if it is different. Then trigger a silent update
        else {
          const matchedFieldContent = objectsWithoutCurrent.find(e => e._id === this.localInput._id)
          if (matchedFieldContent && this.localInput.label !== matchedFieldContent.label) {
            this.localInput.label = matchedFieldContent.label
            this.signalInput(true)
          }
        }
      }

      await CurrentObjectDB.close()

      this.allDocumentsWithoutCurrent = objectsWithoutCurrent

      // @ts-ignore
      allObjects = null
      // @ts-ignore
      allDbObjects = null
    }
  }

  /****************************************************************/
  // FIELD ACTIONS
  /****************************************************************/

  /**
   * Opens a new tab from a connected rleationship
   */
  async openNewTab (input: I_FieldRelationship) {
    const CurrentObjectDB = new PouchDB(input.type)
    const retrievedObject = await CurrentObjectDB.get(input._id)

    const dataPass = {
      doc: retrievedObject,
      treeAction: false
    }

    // @ts-ignore
    this.SSET_addOpenedDocument(dataPass)
    await CurrentObjectDB.close()
  }

  /**
   * Signals the input change to the document body parent component
   */
  @Emit()
  signalInput (skipSave?: boolean) {
    this.inputNote = (this.localInput !== null) ? this.inputNote : { pairedId: "", value: "" }
    return {
      value: this.localInput,
      addedValues: this.inputNote,
      skipSave: (skipSave)
    }
  }
}
</script>

<style lang="scss" scoped>
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
}
</style>

<style lang="scss">
.connectionList {
  .q-item {
    padding-right: 30px;
    padding-left: 10px;
  }

  .q-item__section {
    position: relative;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;

    .relationshipOpeningButton {
      position: absolute;
      right: -30px;
    }
  }
}

.connectionList .connectionNote {
  color: #000;
  opacity: 0.8;
}
</style>
