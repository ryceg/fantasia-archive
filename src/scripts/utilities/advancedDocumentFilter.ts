import { I_Blueprint } from "src/interfaces/I_Blueprint"
import { I_ShortenedDocument } from "./../../interfaces/I_OpenedDocument"

/**
 * Handles advanced filtering for any kind of search-field involving documents
 */
export const advancedDocumentFilter = (inputString: string, currentDocumentList: I_ShortenedDocument[], blueprintList: I_Blueprint[], allDocuments: I_ShortenedDocument[]) => {
  /****************************************************************/
  // Data refresh from previous filters
  /****************************************************************/
  currentDocumentList = currentDocumentList.map(doc => {
    doc.label = doc.label.replace(/<[^>]+>/g, "")

    // @ts-ignore
    doc.hierarchicalPath = doc.hierarchicalPath.replace(/<[^>]+>/g, "")

    doc.fullWordMatch = 0
    doc.partialWordMatch = 0
    doc.exactMatch = false
    doc.filteredOut = false
    doc.activeTypeSearch = false
    return doc
  })

  /****************************************************************/
  // Refresh sorting to avoid random reshufling from previous searches
  /****************************************************************/
  currentDocumentList = currentDocumentList.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type)
    }
    else {
      return a.label.localeCompare(b.label)
    }
  })

  /****************************************************************/
  // Build advanced search data
  /****************************************************************/

  const searchWordList = inputString.toLowerCase().split(" ")

  let categorySeach = false as unknown as string
  let tagSearch = false as unknown as string
  let typeSeach = false as unknown as string
  let fieldSearch = false as unknown as string

  const categorySeachIndex = searchWordList.findIndex(w => w.charAt(0) === ">")
  const tagSearchIndex = searchWordList.findIndex(w => w.charAt(0) === "#")
  const typeSeachIndex = searchWordList.findIndex(w => w.charAt(0) === "$")
  const fieldSearchIndex = searchWordList.findIndex(w => w.charAt(0) === "%")

  if (categorySeachIndex >= 0) {
    categorySeach = searchWordList[categorySeachIndex].substring(1)
    searchWordList[categorySeachIndex] = ""
  }
  if (tagSearchIndex >= 0) {
    tagSearch = searchWordList[tagSearchIndex].substring(1)
    searchWordList[tagSearchIndex] = ""
  }
  if (typeSeachIndex >= 0) {
    typeSeach = searchWordList[typeSeachIndex].substring(1)
    searchWordList[typeSeachIndex] = ""
  }

  if (fieldSearchIndex >= 0) {
    fieldSearch = searchWordList[fieldSearchIndex].substring(1)
    searchWordList[fieldSearchIndex] = ""
  }

  const filteredSearchWordList = searchWordList.filter(w => w !== "")

  /****************************************************************/
  // Field filter
  /****************************************************************/

  if (fieldSearch) {
    currentDocumentList = currentDocumentList.filter(doc => {
      const documentType = blueprintList.find(bluePrint => bluePrint._id === doc.type)

      if (!documentType) {
        return
      }

      const mappedFields = documentType.extraFields
        .filter(field => field.type !== "break")
        .filter(field => field.type !== "tags")
        .filter(field => field.type !== "switch")
        .filter(field => field.id !== "name")
        .filter(field => field.id !== "parentDoc")
        .map(field => {
          const matchedField = doc.extraFields.find(sub => sub.id === field.id)
          let returnValue = matchedField?.value

          // Convert numbers to strings
          if (field.type === "number" && typeof returnValue === "number") {
            returnValue = returnValue.toString()
          }

          // Build string out of multi-selects
          if (field.type === "multiSelect" && Array.isArray(returnValue)) {
            returnValue = returnValue.join(" ")
          }

          // Build string out of lists
          if (field.type === "list" && Array.isArray(returnValue)) {
            returnValue = returnValue
              .map((e: {value: string, affix: string}) => `${e.value} ${e.affix}`)
              .join("")
          }

          // Build string out of single-relationship
          if ((
            field.type === "singleToManyRelationship" ||
            field.type === "singleToSingleRelationship" ||
            field.type === "singleToNoneRelationship"
          ) && returnValue && returnValue.value
          ) {
            const valueToMap = Array.isArray(returnValue.value) ? returnValue.value[0] : returnValue.value

            // @ts-ignore
            const matchingDocument = allDocuments.find(doc => doc.id === valueToMap._id)
            if (matchingDocument) {
              // @ts-ignore
              returnValue = matchingDocument.extraFields.find(e => e.id === "name")?.value as string
            }
            else {
              returnValue = ""
            }
          }

          // Build string out of multi-relationship
          if ((
            field.type === "manyToManyRelationship" ||
            field.type === "manyToSingleRelationship" ||
            field.type === "manyToNoneRelationship"
          ) && returnValue && returnValue.value
          ) {
            const valuesToMap = returnValue.value as {_id: string}[]

            const mappedValues = valuesToMap
              .map(value => {
                // @ts-ignore
                const matchingDocument = allDocuments.find(doc => doc.id === value._id)
                if (matchingDocument) {
                // @ts-ignore
                  return matchingDocument.extraFields.find(e => e.id === "name")?.value as string
                }
                return " "
              })
              .filter(e => e !== " ")
              .join(" ")
            returnValue = mappedValues
          }

          // Fix all missing values that slipped through
          if (!returnValue || returnValue.value === null) {
            returnValue = ""
          }

          let returnValueFormat = returnValue as string

          returnValueFormat = returnValueFormat.toLowerCase()
          returnValueFormat = returnValueFormat.replace(/>/gi, "")
          returnValueFormat = returnValueFormat.replace(/ {2}/gi, " ")
          returnValueFormat = returnValueFormat.replace(/ {2}/gi, " ")
          returnValueFormat = returnValueFormat.replace(/ {2}/gi, " ")
          returnValueFormat = returnValueFormat.replace(/ /gi, "-")

          let name = field.name

          name = name.toLowerCase()
          name = name.replace(/>/gi, "")
          name = name.replace(/ {2}/gi, "-")
          name = name.replace(/ /gi, "-")

          return {
            name: name,
            value: returnValueFormat
          }
        })

      let searchString = fieldSearch.toLowerCase()
      searchString = searchString.replace(/>/gi, "")
      searchString = searchString.replace(/ {2}/gi, "-")
      searchString = searchString.replace(/ /gi, "-")
      const searchDuo = searchString.split(":")

      if (searchDuo.length === 2) {
        let foundMatch = false
        mappedFields.forEach(field => {
          if (field.name.includes(searchDuo[0]) && field.value.includes(searchDuo[1])) {
            foundMatch = true
          }
        })
        return foundMatch
      }
      else {
        return false
      }
    })
  }

  /****************************************************************/
  // Category filter
  /****************************************************************/

  if (categorySeach) {
    currentDocumentList = currentDocumentList.filter(doc => {
      let stringPath = doc.hierarchicalPath as unknown as string
      stringPath = stringPath.toLowerCase()
      stringPath = stringPath.replace(/>/gi, "")
      stringPath = stringPath.replace(/ {2}/gi, "-")
      stringPath = stringPath.replace(/ /gi, "-")

      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      doc.hierarchicalPath = `<span class="text-primary text-bold">${doc.hierarchicalPath}</span>`

      return (stringPath.includes(categorySeach))
    })
  }

  /****************************************************************/
  // Tag filter
  /****************************************************************/
  if (tagSearch) {
    currentDocumentList = currentDocumentList.filter(doc => {
      let matchFound = false

      if (doc.tags) {
        doc.tags.forEach((tag, index) => {
          const ogTag = tag
          tag = tag.toLowerCase()
          tag = tag.replace(/>/gi, "")
          tag = tag.replace(/ {2}/gi, "-")
          tag = tag.replace(/ /gi, "-")
          if (tag.includes(tagSearch)) {
            // @ts-ignore
            doc.tags[index] = `<span class="text-primary text-bold">${ogTag}</span>`
          }
          matchFound = (tag.includes(tagSearch) || matchFound)
        })
      }
      return matchFound
    })
  }
  /****************************************************************/
  // Type filter
  /****************************************************************/

  if (typeSeach) {
    currentDocumentList = currentDocumentList.filter(doc => {
      let stringPath = blueprintList.find(bluePrint => bluePrint._id === doc.type)?.nameSingular

      if (!stringPath) {
        return
      }
      stringPath = stringPath.replace(/>/gi, "")
      stringPath = stringPath.replace(/ {2}/gi, "-")
      stringPath = stringPath.replace(/ /gi, "-")

      stringPath = stringPath.toLowerCase()

      doc.activeTypeSearch = true

      return (stringPath.includes(typeSeach))
    })
  }

  /****************************************************************/
  // Return list without further lookup for actual text if none is present
  /****************************************************************/
  if (filteredSearchWordList.length === 0) {
    return currentDocumentList
  }

  /****************************************************************/
  // Priority search & filtering out non-matching search results
  /****************************************************************/
  currentDocumentList.forEach(doc => {
    // If we have a precise matching letter to letter
    if (doc.label.toLowerCase() === filteredSearchWordList.join(" ")) {
      doc.exactMatch = true
      return
    }

    const documentWordList = doc.label.toLowerCase().split(" ")
    let documentWordListColoring = doc.label.split(" ")

    // Safeguards
    let previousWordNotFound = false
    const foundWordList: string[] = []

    // Check for individual word fragments
    filteredSearchWordList.forEach(filterWord => {
      let wordNotFound = true
      documentWordList.forEach(docWord => {
        if (foundWordList.includes(docWord)) {
          return
        }
        if (docWord === filterWord) {
          // @ts-ignore
          doc.fullWordMatch += 1
          wordNotFound = false
          foundWordList.push(docWord)
        }
        if (docWord.includes(filterWord)) {
          // @ts-ignore
          doc.partialWordMatch += 1
          wordNotFound = false
          foundWordList.push(docWord)
        }
      })
      // Safeguards
      doc.filteredOut = !(!wordNotFound && !previousWordNotFound)
      previousWordNotFound = wordNotFound
    })

    // Color the word if they were found
    documentWordListColoring = documentWordListColoring.map(docWord => {
      if (foundWordList.includes(docWord.toLowerCase())) {
        return `<span class="text-primary text-bold">${docWord}</span>`
      }
      return docWord
    })
    doc.label = documentWordListColoring.join(" ")
  })

  // Cover case of exact match
  currentDocumentList.map(doc => {
    if (doc.exactMatch) {
      doc.label = `<span class="text-primary text-bold">${doc.label}</span>`
    }
    return doc
  })

  /****************************************************************/
  // Sorting
  /****************************************************************/

  // Partial word matching
  // @ts-ignore
  currentDocumentList = currentDocumentList.sort((a, b) => (a?.partialWordMatch > b?.partialWordMatch) ? -1 : 1)

  // Full word matching
  // @ts-ignore
  currentDocumentList = currentDocumentList.sort((a, b) => (a?.fullWordMatch > b?.fullWordMatch) ? -1 : 1)

  // Exact matching
  currentDocumentList = currentDocumentList.sort((a) => (a?.exactMatch) ? -1 : 1)

  /****************************************************************/
  // If there is anything in the search, filter properly
  /****************************************************************/
  if (filteredSearchWordList.length > 0) {
    currentDocumentList = currentDocumentList.filter(doc => {
      // @ts-ignore
      return ((doc.exactMatch || doc.fullWordMatch > 0 || doc.partialWordMatch > 0) && !doc.filteredOut)
    })
  }

  return currentDocumentList
}
