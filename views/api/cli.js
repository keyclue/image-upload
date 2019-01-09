#!/usr/bin/env node

'use strict'
var inquirer = require('inquirer')
var chalk = require('chalk')
var xlsx = require('node-xlsx')
var mongoose = require('mongoose')
var _ = require('lodash')
var fs = require('fs')
var path = require('path')
var async = require('async')
var beautify = require('js-beautify').js_beautify
var introQuestions = [{
  type: 'list',
  name: 'intro',
  message: 'What do you want to do?',
  choices: [
    // new inquirer.Separator(chalk.green('Import - Data + File:')),
    'Parse XLSX Data to File',
    // new inquirer.Separator(chalk.green('Import - Data + DB:')),
    'Parse XLSX Data to Mongoose',
    // new inquirer.Separator(chalk.green('Export - Data in XLSX:')),
    'Export Mongoose Collection to XLSX',
    // new inquirer.Separator(chalk.green('Util:')),
    'Check Mongo Connection',
    'Check Path',
    'Exit'
  ]
}]

var validateChoiceQuestions = [{
  type: 'list',
  name: 'validChoice',
  message: 'How Do you want to validate your data?',
  choices: [
    'By Each Object',
    'By One Sample '
  ]
}]
var dataGoodQuestion = [{
  type: 'confirm',
  name: 'confirmData',
  message: 'Does the data look right (just hit enter for YES)?',
  default: true
}]
var pathQuestion = [{
  type: 'input',
  name: 'path',
  message: "What's the path you to file you want to create",
  default: function () {
    return './ex/data.txt'
  }
}]
var pathXlsxQuestion = [{
  type: 'input',
  name: 'path',
  message: "What's the path you to file you want to create",
  default: function () {
    return './ex/data.xlsx'
  }
}]
var MongoQuestion = [{
  type: 'input',
  name: 'uri',
  message: "What's the URI you to file you want to create",
  default: function () {
    return 'mongodb://localhost/test'
  }
}]
var ParsePathQuestion = [{
  type: 'input',
  name: 'path',
  message: "What's the path to file you want to parse",
  default: function () {
    return './ex/data.xlsx'
  }
}]

var schemaPreQuestion = [{
  type: 'list',
  name: 'schemaQuestions',
  message: 'Mongoose Schema',
  choices: [
    'Create Custom Create',
    'Import Schema'
  ]
}]
var schemaNameQuestion = [{
  type: 'input',
  name: 'name',
  message: 'Name of the Schema',
  default: function () {
    return 'example'
  }
}]

var schemaQuestions = [{
  type: 'input',
  name: 'field',
  message: 'Name of the field',
  default: function () {
    return 'Example'
  }
}, {
  type: 'list',
  name: 'type',
  message: "What's the type",
  choices: [
    'String',
    'Number',
    'Date',
    'Buffer',
    'Boolean',
    'Mixed',
    'Objectid',
    'Array'
  ],
  default: function () {
    return 'String'
  }
}, {
  type: 'input',
  name: 'default',
  message: "What's the default value(just hit enter for NULL)",
  default: function () {
    return null
  }
}, {
  type: 'confirm',
  name: 'askAgain',
  message: 'Want to add another field (just hit enter for YES)?',
  default: true
}]
var askAgainQuestion = [{
  type: 'confirm',
  name: 'askAgain',
  message: 'Want to add another Schema (just hit enter for YES)?',
  default: true
}]
var importQuestion = [{
  type: 'input',
  name: 'import',
  message: 'Place your schema object here',
  default: function () {
    return '{"name": {"type": "String"}}'
  }
}]
function parseData (path) {
  var obj = xlsx.parse(path)
  var imported = {}
  var arrayFlag = []
  var arrayHolder = {}
  _.map(obj, function (main, mainkey) {
    imported[main.name] = []
    _.map(main.data, function (n, k) {
      // create the init obj
      if (k !== 0) imported[main.name][k - 1] = {} // !==0
      _.map(n, function (value, valuekey) {
        // check where you want a array or obj or just field
        if (k !== 0) { // ==1 to test 0 for prod
          if (main.data[0][valuekey].indexOf('.') !== -1) {
            var object = main.data[0][valuekey].split('.')
            if (imported[main.name][k - 1][object[0]]) {
              imported[main.name][k - 1][object[0]][object[1]] = value
            } else {
              imported[main.name][k - 1][object[0]] = {}
              imported[main.name][k - 1][object[0]][object[1]] = value
            }
          } else if (main.data[0][valuekey].indexOf('_') !== -1) {
            var objectArray = main.data[0][valuekey].split('_')
            if (arrayFlag.indexOf(objectArray[0]) === -1) arrayFlag.push(objectArray[0])
            if (arrayHolder[objectArray[0]]) {
              arrayHolder[objectArray[0]][objectArray[1]] = value
            } else {
              arrayHolder[objectArray[0]] = {}
              arrayHolder[objectArray[0]][objectArray[1]] = value
            }
          } else {
            imported[main.name][k - 1][main.data[0][valuekey]] = value
          }
        }
      })
      // take the array holder and push them tot here proper array or just push them without the holder
      if (k !== 0) {
        _.forEach(arrayHolder, function (hold, holdkey) {
          if (holdkey.indexOf(',') === -1) {
            if (_.isArray(imported[main.name][k - 1][holdkey])) {
              imported[main.name][k - 1][holdkey].push(arrayHolder[holdkey])
            } else {
              imported[main.name][k - 1][holdkey] = []
              imported[main.name][k - 1][holdkey].push(arrayHolder[holdkey])
            }
          } else {
            var objectArrayCheck = holdkey.split(',')
            if (_.isArray(imported[main.name][k - 1][objectArrayCheck[0]])) {
              imported[main.name][k - 1][objectArrayCheck[0]].push(arrayHolder[holdkey])
            } else {
              imported[main.name][k - 1][objectArrayCheck[0]] = []
              imported[main.name][k - 1][objectArrayCheck[0]].push(arrayHolder[holdkey])
            }
          }
        })
      }
    })
  })
  return imported
}
function dataGoodQuestionFunc (cb) {
  inquirer.prompt(dataGoodQuestion).then(function (answers) {
    cb(answers.confirmData)
  })
}

function parseDatabySample (cb) {
  inquirer.prompt(ParsePathQuestion).then(function (parsing) {
    if (!fs.existsSync(path.resolve(parsing.path))) {
      console.log(chalk.red('Unable to find \n Path:' + path.resolve(parsing.path)))
      process.exit()
    }
    var data = parseData(parsing.path)
    var task = [function (callback) {
      callback(null, 'none')
    }]
    _.forEach(data, function (pd, pdk) {
      _.forEach(pd, function (n, k) {
        if (k === 0) {
          task.push(function (arg1, callback) {
            console.log(chalk.blue(beautify(JSON.stringify(n))))
            dataGoodQuestionFunc(function (dataAnwser) {
              if (dataAnwser) callback(null, data)
              else callback(true, null)
            })
          })
        }
      })
    })
    async.waterfall(task, function (err, result) {
      if (err) {
        console.log(chalk.red('Data Not Formatted Correctly ... \n EXITING NOW '))
        process.exit()
      } else {
        cb(data)
      }
    })
  })
}

function parseDatabyObject (cb) {
  inquirer.prompt(ParsePathQuestion).then(function (parsing) {
    if (!fs.existsSync(path.resolve(parsing.path))) {
      console.log(chalk.red('Unable to find \n Path:' + path.resolve(parsing.path)))
      process.exit()
    }
    var data = parseData(parsing.path)
    var task = [function (callback) {
      callback(null, 'none')
    }]
    _.forEach(data, function (pd, pdk) {
      _.forEach(pd, function (n, k) {
        task.push(function (arg1, callback) {
          console.log(chalk.blue(beautify(JSON.stringify(n))))
          dataGoodQuestionFunc(function (dataAnwser) {
            if (dataAnwser) callback(null, data)
            else callback(true, null)
          })
        })
      })
    })
    async.waterfall(task, function (err, result) {
      if (err) {
        console.log(chalk.red('Data Not Formatted Correctly ... \n EXITING NOW '))
        process.exit()
      } else {
        cb(data)
      }
    })
  })
}

var schemaOutput = []

function buildSchema (cb) {
  inquirer.prompt(schemaQuestions).then(function (fields) {
    schemaOutput.push(fields)
    if (fields.askAgain) {
      buildSchema(cb)
    } else {
      cb(schemaOutput)
    }
  })
}

function askAgain (cb) {
  inquirer.prompt(askAgainQuestion).then(function (ask) {
    cb(ask.askAgain)
  })
}

function importBuilder (cb) {
  inquirer.prompt(importQuestion).then(function (importObj) {
    var data = JSON.parse(JSON.stringify(importObj.import))
    // Use JSON.parse JSON.parse(stringifiedObject)
    // Use new function, var parsed = new Function('return ' + stringifiedObject)()
    // use eval, eval(stringifiedObject)
    try {
      var ConvertedData = JSON.parse(data)
    } catch (err) {
      console.log(chalk.red(err + ' - Error when parsing your imported schema'))
      process.exit()
    }
    cb(ConvertedData)
  })
}

function ask () {
  inquirer.prompt(introQuestions).then(function (answers) {
    switch (answers.intro) {
      case 'Parse XLSX Data to File':
        inquirer.prompt(validateChoiceQuestions).then(function (valid) {
          if (valid.validChoice === 'By Each Object') {
            parseDatabyObject(function (data) {
              inquirer.prompt(pathQuestion).then(function (pathAnwser) {
                if (!fs.existsSync(path.parse(pathAnwser.path).dir)) {
                  fs.mkdirSync(path.parse(pathAnwser.path).dir)
                }
                fs.writeFile(pathAnwser.path, beautify(JSON.stringify(data), {
                  indent_size: 2
                }), function (err) {
                  if (err) return console.log(err)
                  console.log(chalk.green('Created \n Path:' + pathAnwser.path))
                  process.exit()
                })
              })
            })
          } else {
            parseDatabySample(function (data) {
              inquirer.prompt(pathQuestion).then(function (pathAnwser) {
                if (!fs.existsSync(path.parse(pathAnwser.path).dir)) {
                  fs.mkdirSync(path.parse(pathAnwser.path).dir)
                }
                fs.writeFile(pathAnwser.path, beautify(JSON.stringify(data), {
                  indent_size: 2
                }), function (err) {
                  if (err) return console.log(err)
                  console.log(chalk.green('Created \n Path:' + pathAnwser.path))
                  process.exit()
                })
              })
            })
          }
        })
        break
      case 'Parse XLSX Data to Mongoose':
        inquirer.prompt(MongoQuestion).then(function (mongo) {
          mongoose.connect(mongo.uri)
          mongoose.connection.onOpen(function () {
            console.log(mongoose.connection.readyState ? chalk.green('Connected') : chalk.red('Not Connected'))
            if (!mongoose.connection.readyState) {
              console.log(chalk.red('Exiting Now'))
              process.exit()
            }

            inquirer.prompt(schemaPreQuestion).then(function (pretype) {
              var models = {}
              if (pretype.schemaQuestions === 'Create Custom Create') {
                function schemaCreateCustom () {
                  inquirer.prompt(schemaNameQuestion).then(function (schema) {
                    var tempModel = {}
                    buildSchema(function (data) {
                      _.forEach(data, function (n, k) {
                        tempModel[n.field] = {}
                        tempModel[n.field].type = n.type
                        tempModel[n.field].default = n.default
                      })
                      var newSchema = new mongoose.Schema(tempModel)
                      models[schema.name] = mongoose.model('stats', newSchema)
                      askAgain(function (askAgainValue) {
                        if (askAgainValue) {
                          schemaCreateCustom()
                        } else {
                          inquirer.prompt(validateChoiceQuestions).then(function (valid) {
                            if (valid.validChoice === 'By Each Object') {
                              parseDatabyObject(function (data) {
                                _.forEach(data, function (imp, impkey) {
                                  if (models[impkey]) {
                                    models[impkey].create(data[impkey]).then(function (success) {
                                      console.log(chalk.green(success), 'success')
                                      process.exit()
                                    }, function (err) {
                                      console.log(chalk.red(err), 'catch on import create')
                                      process.exit()
                                    })
                                  } else {
                                    console.log(chalk.red('NO Model for this data:' + impkey))
                                    process.exit()
                                  }
                                })
                              })
                            } else {
                              parseDatabySample(function (data) {
                                _.forEach(data, function (imp, impkey) {
                                  if (models[impkey]) {
                                    models[impkey].create(data[impkey]).then(function (success) {
                                      console.log(chalk.green(success), 'success')
                                      process.exit()
                                    }, function (err) {
                                      console.log(chalk.red(err), 'catch on import create')
                                      process.exit()
                                    })
                                  } else {
                                    console.log(chalk.red('NO Model for this data:' + impkey))
                                    process.exit()
                                  }
                                })
                              })
                            }
                          }) // end of the VALID CHOIC
                        }
                      })
                    })
                  })
                }
                schemaCreateCustom()
              } else {
                function schemaImport () {
                  inquirer.prompt(schemaNameQuestion).then(function (schema) {
                    importBuilder(function (obj) {
                      models[schema.name] = mongoose.model(schema.name, obj)
                      askAgain(function (askAgainValue) {
                        if (askAgainValue) {
                          schemaImport()
                        } else {
                          inquirer.prompt(validateChoiceQuestions).then(function (valid) {
                            if (valid.validChoice === 'By Each Object') {
                              parseDatabyObject(function (data) {
                                _.forEach(data, function (imp, impkey) {
                                  if (models[impkey]) {
                                    models[impkey].create(data[impkey]).then(function (success) {
                                      console.log(chalk.green(success), 'success')
                                      process.exit()
                                    }, function (err) {
                                      console.log(chalk.red(err), 'catch on import create')
                                      process.exit()
                                    })
                                  } else {
                                    console.log(chalk.red('NO Model for this data:' + impkey))
                                    process.exit()
                                  }
                                })
                              })
                            } else {
                              parseDatabySample(function (data) {
                                _.forEach(data, function (imp, impkey) {
                                  if (models[impkey]) {
                                    models[impkey].create(data[impkey]).then(function (success) {
                                      console.log(chalk.green(success), 'success')
                                      process.exit()
                                    }, function (err) {
                                      console.log(chalk.red(err), 'catch on import create')
                                      process.exit()
                                    })
                                  } else {
                                    console.log(chalk.red('NO Model for this data:' + impkey))
                                    process.exit()
                                  }
                                })
                              })
                            }
                          }) // end of the VALID CHOIC
                        } // end of the ELSE
                      })
                    })
                  })
                }
                schemaImport()
              }
            })
          })
        })
        break
      case 'Export Mongoose Collection to XLSX':
        inquirer.prompt(MongoQuestion).then(function (mongo) {
          mongoose.connect(mongo.uri)
          mongoose.connection.onOpen(function () {
            console.log(mongoose.connection.readyState ? chalk.green('Connected') : chalk.red('Not Connected'))
            if (!mongoose.connection.readyState) {
              console.log(chalk.red('Exiting Now'))
              process.exit()
            }

            inquirer.prompt(schemaPreQuestion).then(function (pretype) {
              var models = {}
              if (pretype.schemaQuestions === 'Create Custom Create') {
                function schemaCreateCustom () {
                  inquirer.prompt(schemaNameQuestion).then(function (schema) {
                    var tempModel = {}
                    buildSchema(function (data) {
                      _.forEach(data, function (n, k) {
                        tempModel[n.field] = {}
                        tempModel[n.field].type = n.type
                        tempModel[n.field].default = n.default
                      })
                      models[schema.name] = mongoose.model(schema.name, tempModel)
                      models[schema.name].find().exec().then(function (modelResponse) {
                        var keys = _.keys(models[schema.name].schema.tree)
                        var tab = []
                        tab.push(keys)
                        _.forEach(modelResponse, function (n, k) {
                          var tempKey = []
                          _.forEach(keys, function (key) {
                            tempKey.push(n[key])
                          })
                          tab.push(tempKey)
                        })
                        var buffer = xlsx.build([{
                          name: schema.name,
                          data: tab
                        }])
                        inquirer.prompt(pathXlsxQuestion).then(function (pathAnwser) {
                          if (!fs.existsSync(path.parse(pathAnwser.path).dir)) {
                            fs.mkdirSync(path.parse(pathAnwser.path).dir)
                          }
                          fs.writeFile(pathAnwser.path, buffer, function (err) {
                            if (err) return console.log(err)
                            console.log(chalk.green('Created \n Path:' + pathAnwser.path))
                            process.exit()
                          })
                        })
                      }) // END OF MODEL FIND()                                     
                    })
                  })
                }
                schemaCreateCustom()
              } else {
                function schemaImport () {
                  inquirer.prompt(schemaNameQuestion).then(function (schema) {
                    importBuilder(function (obj) {
                      models[schema.name] = mongoose.model(schema.name, obj)
                      models[schema.name].find().exec().then(function (modelResponse) {
                        var keys = _.keys(models[schema.name].schema.tree)
                        var tab = []
                        tab.push(keys)
                        _.forEach(modelResponse, function (n, k) {
                          var tempKey = []
                          _.forEach(keys, function (key) {
                            tempKey.push(n[key])
                          })
                          tab.push(tempKey)
                        })
                        var buffer = xlsx.build([{
                          name: schema.name,
                          data: tab
                        }])
                        inquirer.prompt(pathXlsxQuestion).then(function (pathAnwser) {
                          if (!fs.existsSync(path.parse(pathAnwser.path).dir)) {
                            fs.mkdirSync(path.parse(pathAnwser.path).dir)
                          }
                          fs.writeFile(pathAnwser.path, buffer, function (err) {
                            if (err) return console.log(err)
                            console.log(chalk.green('Created \n Path:' + pathAnwser.path))
                            process.exit()
                          })
                        })
                      }) // END OF MODEL FIND()
                    })
                  })
                }
                schemaImport()
              }
            })
          })
        })
        break
      case 'Check Mongo Connection':
        inquirer.prompt(MongoQuestion).then(function (mongo) {
          mongoose.connect(mongo.uri)
          mongoose.connection.onOpen(function () {
            console.log(mongoose.connection.readyState ? chalk.green('Connected') : chalk.red('Not Connected'))
            ask()
          })
        })
        break
      case 'Check Path':
        inquirer.prompt(ParsePathQuestion).then(function (parsing) {
          if (!fs.existsSync(path.resolve(parsing.path))) {
            console.log(chalk.red('Unable to find \n Path:' + path.resolve(parsing.path)))
            ask()
          } else {
            console.log(chalk.green('Valid \n Path:' + path.resolve(parsing.path)))
            ask()
          }
        })
        break
      case 'Exit':
        console.log(chalk.red('Exiting Now'))
        process.exit()
        break
    }
  })
}
ask()
