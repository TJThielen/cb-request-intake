function updateDropdown() {
    const formId = PropertiesService.getScriptProperties().getProperty("FormId");
    const publicItems = getPublicItems().flat();
    const form = FormApp.openById(formId);
    const item = form.getItems(FormApp.ItemType.LIST)[0];
    const dropdown = item.asListItem();
    const dropdownOptions = publicItems.map(item => `${item.id} - ${item.name}`);
  
    dropdown.setChoiceValues(dropdownOptions);
  }
  
  function onFormSubmit(e) {
    const responses = e.response.getItemResponses();
    const changeRequestName = responses[0].getResponse();
    const changeRequestDescription = responses[1].getResponse();
    const changeRequestAssociatedItemArray = responses[2].getResponse().split(" - ");
    const changeRequestAssociatedItem = changeRequestAssociatedItemArray[0];
  
    console.log("Name of CR: " + changeRequestName);
    console.log("Name of Desc: " + changeRequestDescription);
    console.log("Associated Item (if any): " + changeRequestAssociatedItem);
  
    const changeRequestId = createChangeRequest(changeRequestName, changeRequestDescription);
  
    if(changeRequestAssociatedItem != "") {  
      createAssociation(changeRequestId, changeRequestAssociatedItem);
    }
  }
  
  function getPublicItems() {
    const trackers = JSON.parse(getTrackers(8));
    const publicItems = [];
    trackers.forEach(tracker => {
      const fields = JSON.parse(getTrackerFields(tracker.id));
      const publicId = fields.find(field => field.name == 'Public');
      if(publicId){
          const items = JSON.parse(getTracker(tracker.id));
          const firstItem = items.itemRefs[0].id;
          const item = JSON.parse(getItem(firstItem));
          const publicField = item.customFields.find(field => field.name == "Public")
          const publicFieldId = publicField.fieldId;
          const index = parseInt(publicFieldId) - 10000;
          const res = JSON.parse(getItemQuery(`project.id IN (8) AND tracker.id IN (${tracker.id}) AND '${tracker.id}.customField[${index}]' = 'true'`)); //Future TJ: (I know you won't be as good, but do your best) try to make less calls and combine this into one query
          publicItems.push(res.items);
      }
    })
    return publicItems;
  }
  
  function getItemQuery(cbql) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
  
    const options = {
      method: "get",
      contentType: "application/json",
      headers: {
        "Authorization": `Basic ${token}`
      }
    };
  
    const res = UrlFetchApp.fetch(`https://codebeamer.ptc.sourceallies.com/api/v3/items/query?queryString=${cbql}`, options);
    return res.getContentText();
  }
  
  function getTrackerFields(trackerId) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
  
    const options = {
      method: "get",
      contentType: "application/json",
      headers: {
        "Authorization": `Basic ${token}`
      }
    };
  
    const res = UrlFetchApp.fetch(`https://codebeamer.ptc.sourceallies.com/api/v3/trackers/${trackerId}/fields`, options);
    return res.getContentText();
  }
  
  function getItem(itemId) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
  
    const options = {
      method: "get",
      contentType: "application/json",
      headers: {
        "Authorization": `Basic ${token}`
      }
    };
  
    const res = UrlFetchApp.fetch(`https://codebeamer.ptc.sourceallies.com/api/v3/items/${itemId}`, options);
    return res.getContentText();
  }
  
  function getTrackers(projectId) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
  
    const options = {
      method: "get",
      contentType: "application/json",
      headers: {
        "Authorization": `Basic ${token}`
      }
    };
  
    const res = UrlFetchApp.fetch(`https://codebeamer.ptc.sourceallies.com/api/v3/projects/${projectId}/trackers`, options);
    return res.getContentText();
  }
  
  function getTracker(trackerId) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
  
    const options = {
      method: "get",
      contentType: "application/json",
      headers: {
        "Authorization": `Basic ${token}`
      }
    };
  
    const res = UrlFetchApp.fetch(`https://codebeamer.ptc.sourceallies.com/api/v3/trackers/${trackerId}/items`, options);
    return res.getContentText();
  }
  
  function createChangeRequest(name, description) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
  
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
          "Authorization": `Basic ${token}`
      },
      payload: JSON.stringify({
        "name": name,
        "description": description,
        "tracker": {
            "id": 10061,
            "type": "TrackerReference"
        },
      })
    };
  
    const res = UrlFetchApp.fetch("https://codebeamer.ptc.sourceallies.com/api/v3/trackers/10061/items", options);
    const content = JSON.parse(res.getContentText());
    return content.id;
  }
  
  function createAssociation(changeRequestId, associatedItemId) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
  
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
          "Authorization": `Basic ${token}`
      },
      payload: JSON.stringify({
        "biDirectionalPropagation": true,
        "propagatingSuspects": true,
        "from": {
          "id": changeRequestId,
          "type": "TrackerItemReference"
        },
        "to": {
          "id": associatedItemId,
          "type": "TrackerItemReference"
        },
        "type": {
          "id": 1,
        }
      })
    };
  
    UrlFetchApp.fetch("https://codebeamer.ptc.sourceallies.com/api/v3/associations", options);
  }
  
  function enableSuspectFlag(name, description, id) {
    const token = PropertiesService.getScriptProperties().getProperty("Token");
    
    const options = {
      method: "put",
      contentType: "application/json",
      headers: {
        "Authorization": `Basic ${token}`
      },
      payload: JSON.stringify({
        "name": name,
        "description": `${description} `,
        "tracker": {
          "id": 10061,
          "type": "TrackerReference"
        },
        "status": {
          "id": 1,
          "name": "New",
          "type": "ChoiceOptionReference"
        },
      })
    };
  
    UrlFetchApp.fetch(`https://codebeamer.ptc.sourceallies.com/api/v3/items/${id}`, options);
  }
  
  function main(){
    const res = getItemQuery("project.id IN (8) AND tracker.id IN (10061) AND '10061.customField[0]' = 'true'")
    console.log(res);
  }