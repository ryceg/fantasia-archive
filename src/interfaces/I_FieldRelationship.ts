export interface I_FieldRelationship{
  type: string
  label: string
  value: string
  url: string
  _id: string
  pairedField: string
  isCategory: boolean
}

export interface I_RelationshipPair {
  addedValues: {
    pairedId: string,
    value: string
  }[]
  value: I_FieldRelationship[],

}

export interface I_RelationshipPairSingle {
  addedValues: {
    pairedId: string,
    value: string
  }
  value: I_FieldRelationship,

}
