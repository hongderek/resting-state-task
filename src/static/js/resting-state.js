const remote = require('electron').remote
const app = remote.app

const nodejs_path = require('path');
const fs = require('fs')

let patient_ID = ''
const task_name = 'RESTING-STATE'
const dateObj = new Date()
const date_today = [dateObj.getFullYear(), (dateObj.getMonth()+1), dateObj.getDate()].join('-')
const date_timestamp = [dateObj.getHours(), dateObj.getMinutes(), dateObj.getSeconds()].join('-')
let filename = ''
let path_to_save = ''
const alldata_folder_name = 'OCD-Project-Data'
const path_to_alldata = nodejs_path.join(app.getPath('home'), alldata_folder_name)


const photodiode_ghost_box = 
  "<div class='photodiode-box' id='photodiode-box'>" +
    "<span class='photodiode-spot unlit' id='photodiode-spot'></span>" +
  "</div>"

let enter_patient_info = {
  type: 'survey-text',
  questions: [{ prompt: '<span id="patient-id-please">Please enter patient ID.</span>'}],
  on_load: () => (document.getElementsByClassName('jspsych-content-wrapper')[0].style.cursor = 'default'),
  on_finish: function(data) {
    const answer = JSON.parse(data.responses)['Q0']
    patient_ID = (answer === '') ? 'TEST_ID' : answer
  }
}

function saveToFile(data, path_to_file) {
  fs.writeFile(path_to_file, data, (err) => {
    if (err) throw err;
    console.log('Data saved to ' + path_to_file)
  })
}

function PD_spot_encode(num_code) {
  function pulse_for(elem, ms, callback) {
    elem.style.backgroundColor = 'white'
    setTimeout(() => {
      elem.style.backgroundColor = 'black'
      callback()
    }, ms)
  }

  function repeat_pulse_for(elem, ms, i) {
    if (i > 0) {
      pulse_for(elem, ms, () => {
        setTimeout(() => {
          repeat_pulse_for(elem, ms, i-1)
        }, ms)
      })
    }
  }

  const spot = document.getElementById('photodiode-spot')
  repeat_pulse_for(spot, 40, num_code)
}

const resting_pulse_encode = {
  'type': 'html-keyboard-response',
  'choices': jsPsych.NO_KEYS,
  'trial_duration': 2000,
  'stimulus': 
    '<h1>Setting up task, please wait...</h1>' +
    "<div class='photodiode-box' id='photodiode-box'>" +
      "<span class='photodiode-spot unlit' id='photodiode-spot'></span>" +
    "</div>",
  'on_load': function() {
    setTimeout(() => PD_spot_encode(12), 400)
  }
}

const fullscreen_shortcut = (process.platform === 'darwin') ? 'Command+Control+F' : 'Fn+F11' //else, linux
const zoomin_shortcut = (process.platform === 'darwin') ? 'Command+=' : 'Control+Shift+=' //else, linux
const zoomout_shortcut = (process.platform === 'darwin') ? 'Command+-' : 'Control+-' //else, linux
var new_experiment_screen = {
  type: 'html-button-response',
  stimulus: '<span id="task-name"><h1>Resting State Task</h1></span>' + photodiode_ghost_box,
  choices: ['Continue'],
  // prompt: ['<h3 style="color:white;">Press "' + fullscreen_shortcut + '" to toggle Fullscreen.</h3>'].join(''),
  on_load: () => (document.getElementsByClassName('jspsych-content-wrapper')[0].style.cursor = 'default')
}

const instructions = {
  'type': 'instructions',
  'pages': [
    '<h3 class="instructions-text">Please sit quietly for the next three minutes.</h3><h3 class="instructions-text">Try to fixate on the dot on the screen</h3><h3 class="instructions-text">Keep your eyes open and try not to move around too much</h3><h3 class="instructions-text">Press the Space key to begin</h3>'
  ],
  'key_forward': ' ',
  'on_load': () => (document.getElementsByClassName('jspsych-content-wrapper')[0].style.cursor = 'none')
}

const resting_task = {
  'type': 'html-keyboard-response',
  'choices': jsPsych.NO_KEYS,
  'stimulus': '<div id="fixation-dot">hi</div>',
  'response-ends-trial': false,
  'trial_duration': (60*3 * 1000),
  'on_load': function() {
    // console.log('loaded')
    const path_array = [path_to_alldata, patient_ID, 'metadata', date_today]
    path_to_save = nodejs_path.join(path_to_alldata, patient_ID, 'metadata', date_today)
    filename = ['METADATA', patient_ID, date_today].join('_') + '.JSON'

    function initializePath(path, callback) {
      if (path.length === 0) { throw new Error('Ran out of path!')}
      else {
        const tryFolder = path.pop()
        const tryPath = path.join('/')

        if (fs.existsSync(tryPath)) {
          fs.mkdir(nodejs_path.join(tryPath, tryFolder), callback)
        }
        else {
          initializePath(path, function() {
            fs.mkdir(nodejs_path.join(tryPath, tryFolder), callback)
          })
        }
      }
    }

    const new_metadata = {
      'task': task_name,
      'start_end': 'start',
      'timestamp': Date.now(),
      'patient_ID': patient_ID,
      'metadata': []
    }

    if (fs.existsSync(nodejs_path.join(path_to_save, filename))) {
      fs.readFile(nodejs_path.join(path_to_save, filename), 'utf-8', function(err, fs_data) {
        if (err) throw err;
        let newStream = fs_data.slice(0, -1)
        newStream += ','
        newStream += JSON.stringify(new_metadata) + ']'
        saveToFile(newStream, nodejs_path.join(path_to_save, filename))
      })
    }
    else {
      const newStream = '[' + JSON.stringify(new_metadata) + ']'
      initializePath(path_array, function() {
        saveToFile(newStream, nodejs_path.join(path_to_save, filename))
      })
    }
  },
  'on_finish': function(data) {
    const new_metadata = {
      'task': task_name,
      'start_end': 'end',
      'timestamp': Date.now(),
      'patient_ID': patient_ID,
      'metadata': []
    }
    fs.readFile(nodejs_path.join(path_to_save, filename), 'utf-8', function(err, fs_data) {
      if (err) throw err;
      let newStream = fs_data.slice(0, -1)
      newStream += ','
      newStream += JSON.stringify(new_metadata) + ']'
      saveToFile(newStream, nodejs_path.join(path_to_save, filename))
    })
  }
}

const finish_up = {
  'type': 'html-keyboard-response',
  'choices': jsPsych.NO_KEYS,
  'stimulus': 'The resting state task is complete.'
}

function begin() {
  jsPsych.init({
    timeline: [
      new_experiment_screen,
      resting_pulse_encode,
      enter_patient_info,
      instructions,
      resting_task,
      finish_up
    ]
  })
}

window.onload = function() {
  if (fs.existsSync(path_to_alldata)) {
    begin()
  }
  else {
    fs.mkdir(path_to_alldata, function() {
      begin()
    })
  }
}
