var layout1 = [
  {
    "type": "column",
    "isClosable": true,
    "reorderEnabled": true,
    "title": "",
    "content": [
      {
        "type": "column",
        "isClosable": true,
        "reorderEnabled": true,
        "title": "",
        "width": 100,
        "height": 58.052434456928836,
        "content": [
          {
            "type": "row",
            "isClosable": true,
            "reorderEnabled": true,
            "title": "",
            "height": 75.60975609756098,
            "content": [
              {
                "type": "stack",
                "width": 43.75,
                "isClosable": true,
                "reorderEnabled": true,
                "title": "",
                "activeItemIndex": 0,
                "height": 50,
                "content": [
                  {
                    "id": 0,
                    "type": "component",
                    "title": "Recipe View",
                    "tooltip": "Overiew of the current recipe",
                    "isClosable": false,
                    "componentName": "d3canvas",
                    "componentState": {
                      "label": "A"
                    },
                    "reorderEnabled": true
                  }
                ]
              },
              {
                "type": "stack",
                "header": {},
                "isClosable": true,
                "reorderEnabled": true,
                "title": "",
                "activeItemIndex": 0,
                "width": 31.249999999999996,
                "content": [
                  {
                    "id": 1,
                    "type": "component",
                    "title": "NGL View",
                    "tooltip": "Structure View",
                    "isClosable": false,
                    "componentName": "ngl",
                    "componentState": {
                      "label": "B"
                    },
                    "reorderEnabled": true
                  }
                ]
              },
              {
                "type": "stack",
                "header": {},
                "isClosable": true,
                "reorderEnabled": true,
                "title": "",
                "activeItemIndex": 0,
                "width": 25,
                "content": [
                  {
                    "id": 2,
                    "type": "component",
                    "title": "Protein Feature View",
                    "isClosable": false,
                    "tooltip": "Protein Feature View",
                    "componentName": "pfv",
                    "componentState": {
                      "label": "C"
                    },
                    "reorderEnabled": true
                  }
                ]
              }
            ]
          },
          {
            "type": "stack",
            "header": {},
            "isClosable": true,
            "reorderEnabled": true,
            "title": "",
            "activeItemIndex": 0,
            "height": 24.390243902439025,
            "content": [
              {
                "type": "component",
                "title": "Table Options",
                "isClosable": false,
                "tooltip": "Grid for selected grid",
                "componentName": "slickgridoptions",
                "componentState": {
                  "id": "",
                  "ind": 1
                },
                "reorderEnabled": true
              }
            ]
          }
        ]
      },
      {
        "type": "row",
        "isClosable": true,
        "reorderEnabled": true,
        "title": "",
        "height": 41.947565543071164,
        "content": [
          {
            "type": "stack",
            "isClosable": true,
            "reorderEnabled": true,
            "title": "",
            "width": 42.91564291564291,
            "activeItemIndex": 1,
            "content": [
              {
                "id": 3,
                "type": "component",
                "title": "Recipe table",
                "isClosable": false,
                "tooltip": "Overiew of the current recipe",
                "componentName": "slickgrid",
                "componentState": {
                  "id": "grid_recipe",
                  "ind": 1
                },
                "reorderEnabled": true
              },
              {
                "id": 4,
                "type": "component",
                "title": "Interaction table",
                "tooltip": "Structure View",
                "isClosable": false,
                "componentName": "slickgrid",
                "componentState": {
                  "id": "grid_interaction",
                  "ind": 2
                },
                "reorderEnabled": true
              }
            ]
          },
          {
            "type": "stack",
            "header": {},
            "isClosable": true,
            "reorderEnabled": true,
            "title": "",
            "activeItemIndex": 0,
            "width": 57.08435708435709,
            "content": [
              {
                "id": 6,
                "type": "component",
                "title": "PDB search table",
                "isClosable": false,
                "tooltip": "Protein Feature View",
                "componentName": "slickgrid",
                "componentState": {
                  "id": "grid_pdb",
                  "ind": 4
                },
                "reorderEnabled": true
              },
              {
                "id": 5,
                "type": "component",
                "title": "Uniprot search table",
                "isClosable": false,
                "tooltip": "Structure View",
                "componentName": "slickgrid",
                "componentState": {
                  "id": "grid_uniprot",
                  "ind": 3
                },
                "reorderEnabled": true
              }
            ]
          }
        ]
      }
    ]
  }
]