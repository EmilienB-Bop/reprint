var jsPsych = initJsPsych({
  use_webaudio: false
});

var timeline = [];

// Variable globale pour suivre si l'utilisateur est sur mobile
let isMobileDevice = false;
// variable globale pour enregistrer réponse mouvement
let selectedMotionGlobal = null;

// Variable pour stocker la condition (fast ou slow)
let speedcondition = jsPsych.randomization.sampleWithoutReplacement(["fast", "slow"])[0];

// Définir la vitesse du cercle inattendu selon la condition
let unexpectedCircleSpeed = speedcondition === "fast" ? -200: -80;

// Fonction pour détecter si l'utilisateur est sur un ordinateur
function isComputer() {
  const userAgent = navigator.userAgent.toLowerCase();
  return !/mobile|android|iphone|ipad|tablet|touch/.test(userAgent);
}

// Ajouter un écran de filtrage au début de la timeline
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: function () {
    isMobileDevice = !isComputer();
    if (!isMobileDevice) {
      return "";
    } else {
      return `
      <p>Pour passer cette version de l'expérience, il vous faut être sur un ordinateur.</p>

      `;
    }
  },
  choices: function () {
    return isMobileDevice ? ["Quitter"]: [];
  },
  button_html: '<button class="jspsych-btn">%choice%</button>',
  on_load: function () {
    if (!isMobileDevice) {
      jsPsych.finishTrial();
    }
  },
  on_finish: function () {
    if (isMobileDevice) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn("Erreur lors de la sortie du plein écran :", err);
        });
      }
      jsPsych.endExperiment("Cette expérience nécessite un ordinateur. Vous allez être redirigé.");
      setTimeout(() => {
        window.location.href = "https://www.univ-tlse2.fr/";
      }, 500);
    }
  },
  data: {
    speedcondition: speedcondition // Enregistrer la condition assignée
  }
});

// Ajouter un garde-fou pour bloquer la progression si l'utilisateur est sur mobile
jsPsych.run = (function (originalRun) {
  return function (timeline) {
    if (isMobileDevice) {
      document.body.innerHTML = `
      <div style="text-align: center; padding: 50px;">
      <p>Pour passer cette version de l'expérience, il vous faut être sur un ordinateur.</p>
      
      <p>Vous allez être redirigé dans quelques secondes.</p>
      </div>
      `;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn("Erreur lors de la sortie du plein écran :", err);
        });
      }
      setTimeout(() => {
        window.location.href = "https://www.univ-tlse2.fr/";
      }, 3000);
      return;
    }
    originalRun.call(this, timeline);
  };
})(jsPsych.run);

timeline.unshift({
  type: jsPsychFullscreen,
  fullscreen_mode: true,
  message: `<strong>Bienvenue !</strong><p>L'expérience va démarrer en plein écran.<br>Appuyez sur le bouton ci-dessous pour continuer.</p>`,
  button_label: "Passer en plein écran",
  data: {
    speedcondition: speedcondition
  }
});

// Ajout des questions sur le sexe et l'âge après le plein écran
timeline.push({
  type: jsPsychSurveyMultiChoice,
  questions: [{
    prompt: "Quel est votre sexe ?",
    options: ["Homme",
      "Femme",
      "Non-binaire",
      "Autre",
      "Préfère ne pas répondre"],
    required: true
  }],
  button_label: "Valider",
  data: {
    question_type: "sexe",
    speedcondition: speedcondition
  },
  on_finish: function (data) {
    data.participant_sex = data.response.Q0;
  }
});

timeline.push({
  type: jsPsychSurveyMultiChoice,
  questions: [{
    prompt: "Quelle est votre tranche d'âge ?",
    options: ["Moins de 18 ans",
      "18-25 ans",
      "26-35 ans",
      "36-50 ans",
      "51 ans et plus"],
    required: true
  }],
  button_label: "Valider",
  data: {
    question_type: "age",
    speedcondition: speedcondition
  },
  on_finish: function (data) {
    data.participant_age = data.response.Q0;
  }
});

// Ajouter une variable globale pour le taux de rafraîchissement
let refreshRate = 0;
let frameCount = 0;
let lastTime = performance.now();

function estimateRefreshRate() {
  let now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    refreshRate = frameCount;
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(estimateRefreshRate);
}
requestAnimationFrame(estimateRefreshRate);

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <p><strong>Bienvenue dans cette expérience.</strong></p>
  <p>8 ronds noirs vont se déplacer sur l'écran et rebondir contre les bords, 4 sont rapides et 4 sont lents.</p>
  <p><strong>Vous devez compter les rebonds des 4 ronds les plus lents,<br> et indiquer à la fin chaque essai le nombre de rebonds que vous avez compté.</br></strong></p>
  <p>Les ronds plus rapides ne sont là que pour vous distraire et rendre la tâche plus compliquée !</p>
  <p>Voici un aperçu, les 4 ronds rapides clignotent <span style="color: red;">en rouge</span> et les 4 lents <span style="color: green;">en vert</span>, dans l'expérience ils resteront noirs.</p>
  <canvas id="welcomeCanvas" style="width: 375px; height: 250px; border: 1px solid black;"></canvas>
  `,
  choices: ["Commencer"],
  data: {
    speedcondition: speedcondition
  },
  on_load: function () {
    let canvas = document.getElementById("welcomeCanvas");
    let ctx = canvas.getContext("2d");
    canvas.width = 400;
    canvas.height = 300;
    canvas.style.width = "400px";
    canvas.style.height = "300px";
    canvas.style.backgroundColor = "#525252";

    let baseRadius = 10; // Rayon fixe
    let shapes = [];

    for (let j = 0; j < 8; j++) {
      let speed,
      group,
      baseColor;
      if (j < 4) {
        speed = 40;
        group = 1;
        baseColor = "green";
      } else {
        speed = 100;
        group = 2;
        baseColor = "red";
      }
      let angle = Math.random() * 2 * Math.PI;
      let offset = baseRadius * 2;

      shapes.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * offset,
        y: canvas.height / 2 + (Math.random() - 0.5) * offset,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        baseColor: baseColor,
        color: baseColor,
        radius: baseRadius,
        group: group,
        lastRebound: null
      });
    }

    let isPaused = false;
    let blinkState = true;

    setInterval(() => {
      if (isPaused) return;
      blinkState = !blinkState;
      shapes.forEach(s => {
        s.color = blinkState ? s.baseColor: "black";
      });
    },
      500);

    function update(dt) {
      if (isPaused) return;
      shapes.forEach(s => {
        s.x += s.dx * dt;
        s.y += s.dy * dt;

        if (s.x - s.radius / 2 <= 0) {
          s.x = s.radius / 2;
          if (s.lastRebound !== "left") {
            s.dx *= -1;
            s.lastRebound = "left";
          }
        } else if (s.x + s.radius / 2 >= canvas.width) {
          s.x = canvas.width - s.radius / 2;
          if (s.lastRebound !== "right") {
            s.dx *= -1;
            s.lastRebound = "right";
          }
        } else {
          if (s.lastRebound === "left" || s.lastRebound === "right") {
            s.lastRebound = null;
          }
        }

        if (s.y - s.radius / 2 <= 0) {
          s.y = s.radius / 2;
          if (s.lastRebound !== "top") {
            s.dy *= -1;
            s.lastRebound = "top";
          }
        } else if (s.y + s.radius / 2 >= canvas.height) {
          s.y = canvas.height - s.radius / 2;
          if (s.lastRebound !== "bottom") {
            s.dy *= -1;
            s.lastRebound = "bottom";
          }
        } else {
          if (s.lastRebound === "top" || s.lastRebound === "bottom") {
            s.lastRebound = null;
          }
        }
      });
    }

    function draw() {
      ctx.clearRect(0,
        0,
        canvas.width,
        canvas.height);
      shapes.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius / 2, 0, 2 * Math.PI);
        ctx.fillStyle = s.color;
        ctx.fill();
      });
      ctx.fillStyle = "black";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("+",
        canvas.width / 2,
        canvas.height / 2);
    }

    let last = performance.now();
    function animate() {
      if (isPaused) return;
      let now = performance.now();
      let dt = (now - last) / 1000;
      last = now;
      update(dt);
      draw();
      requestAnimationFrame(animate);
    }

    animate();
    document.querySelector(".jspsych-btn").addEventListener("click", () => {
      isPaused = true;
    });
  }
});

// Variables globales pour l'entraînement
let trialIndex = 1;
let consecutiveSuccesses = 0;

// Fonction pour créer un essai d'entraînement
function createTrainingTrial(trialIndex) {
  let trueRebounds = 0;

  return [{
    type: jsPsychHtmlButtonResponse,
    stimulus: `Comptez les rebonds des 4 ronds <strong>lents</strong>. C’est parti !</p>`,
    choices: ["Allez !"],
    data: {
      training: true,
      trial_number: trialIndex,
      speedcondition: speedcondition
    }
  },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<canvas id="animationCanvas"></canvas>`,
      choices: "NO_KEYS",
      trial_duration: 20000,
      data: {
        training: true,
        trial_number: trialIndex,
        speedcondition: speedcondition
      },
      on_load: function () {
        adjustCanvasSize();
        let canvas = document.getElementById("animationCanvas");
        let ctx = canvas.getContext("2d");
        canvas.style.backgroundColor = "#525252";

        let baseRadius = 20;
        let diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
        let shapes = [];

        for (let j = 0; j < 8; j++) {
          let speed,
          group;
          if (j < 4) {
            speed = 80;
            group = 1;
          } else {
            speed = 200;
            group = 2;
          }
          let angle = Math.random() * 2 * Math.PI;
          let offset = baseRadius * 2;

          shapes.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * offset,
            y: canvas.height / 2 + (Math.random() - 0.5) * offset,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            color: "black",
            radius: baseRadius,
            group: group,
            lastRebound: null
          });
        }

        let isPaused = false;

        function update(dt) {
          if (isPaused) return;
          shapes.forEach(s => {
            s.x += s.dx * dt;
            s.y += s.dy * dt;

            if (s.x - s.radius / 2 <= 0) {
              s.x = s.radius / 2;
              if (s.lastRebound !== "left") {
                s.dx *= -1;
                if (s.group === 1) trueRebounds++;
                s.lastRebound = "left";
              }
            } else if (s.x + s.radius / 2 >= canvas.width) {
              s.x = canvas.width - s.radius / 2;
              if (s.lastRebound !== "right") {
                s.dx *= -1;
                if (s.group === 1) trueRebounds++;
                s.lastRebound = "right";
              }
            } else {
              if (s.lastRebound === "left" || s.lastRebound === "right") {
                s.lastRebound = null;
              }
            }

            if (s.y - s.radius / 2 <= 0) {
              s.y = s.radius / 2;
              if (s.lastRebound !== "top") {
                s.dy *= -1;
                if (s.group === 1) trueRebounds++;
                s.lastRebound = "top";
              }
            } else if (s.y + s.radius / 2 >= canvas.height) {
              s.y = canvas.height - s.radius / 2;
              if (s.lastRebound !== "bottom") {
                s.dy *= -1;
                if (s.group === 1) trueRebounds++;
                s.lastRebound = "bottom";
              }
            } else {
              if (s.lastRebound === "top" || s.lastRebound === "bottom") {
                s.lastRebound = null;
              }
            }
          });
        }

        function draw() {
          ctx.clearRect(0,
            0,
            canvas.width,
            canvas.height);
          shapes.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius / 2, 0, 2 * Math.PI);
            ctx.fillStyle = s.color;
            ctx.fill();
          });
          ctx.fillStyle = "black";
          ctx.font = "40px Arial";
          ctx.textAlign = "center";
          ctx.fillText("+",
            canvas.width / 2,
            canvas.height / 2);
        }

        let last = performance.now();
        function animate() {
          let now = performance.now();
          let dt = (now - last) / 1000;
          last = now;
          update(dt);
          draw();
          if (!isPaused) {
            requestAnimationFrame(animate);
          }
        }

        animate();
        setTimeout(() => {
          isPaused = true;
        }, 19500);
      },
      on_finish: function (data) {
        data.true_rebounds = trueRebounds;
        data.refresh_rate = refreshRate;
        trueRebounds = 0;
      }
    },
    {
      type: jsPsychSurveyText,
      preamble: `Combien de rebonds des 4 ronds lents avez-vous compté ?</p>`,
      questions: [{
        prompt: "Nombre de rebonds :",
        required: true
      }],
      button_label: "Valider",
      data: {
        training: true,
        trial_number: trialIndex,
        speedcondition: speedcondition
      },
      on_finish: function (data) {
        const lastTrial = jsPsych.data.get().last(2).filter({
          training: true
        }).values()[0];
        const vrai = lastTrial.true_rebounds;
        const rep = parseInt(data.response.Q0) || 0;
        let precision = 0;

        if (vrai > 0) {
          precision = Math.max(0, 100 - (Math.abs(vrai - rep) / vrai) * 100);
        } else if (rep === 0) {
          precision = 100;
        }

        data.true_rebounds = vrai;
        data.participant_rebound_count = rep;
        data.precision = Math.round(precision);

        if (precision >= 80) {
          consecutiveSuccesses++;
        } else {
          consecutiveSuccesses = 0;
        }

        data.feedback_text =
        precision < 80
        ? `Essayez encore ! Votre précision est de <strong><span style="color: red;">${data.precision}%</span></strong> (vrai : ${vrai}, votre réponse : ${rep}).`: consecutiveSuccesses >= 2
        ? `Super ! Votre précision est de <strong><span style="color: green;">${data.precision}%</span></strong> (vrai : ${vrai}, votre réponse : ${rep}). <br><strong>On peut passer à l'expérience !</strong></br>`: `Bravo ! Votre précision est de <strong><span style="color: green;">${data.precision}%</span></strong> (vrai : ${vrai}, votre réponse : ${rep}). <br>Un autre essai comme celui-ci et on pourra passer à l'expérience !</br>`;
      }
    },
    {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        let lastData = jsPsych.data.get().last(1).values()[0];
        return `<p>${lastData.feedback_text}</p>`;
      },
      choices: ["Continuer"],
      data: {
        training: true,
        trial_number: trialIndex,
        speedcondition: speedcondition
      }
    }];
}

// Boucle d'entraînement
let trainingLoop = {
  timeline: createTrainingTrial(jsPsych.timelineVariable("trialIndex")),
  loop_function: function () {
    return consecutiveSuccesses < 2;
  }
};

// Ajouter l'introduction et la boucle d'entraînement à la timeline
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <p>Avant de commencer les vrais essais, vous allez faire des essais d'<strong>entraînement</strong>.</p>
  <p>Le but est de vous familiariser avec la tâche et le comptage des rebonds.</p>
  <p>Vous devez compter les rebonds des 4 ronds <strong>lents</strong>.</p>
  <p>Si vous arrivez à être précis à 80% ou plus sur 2 essais à la suite, on passera à l'expérience !</p>
  `,
  choices: ["Commencer l'entraînement"],
  data: {
    speedcondition: speedcondition
  }
});

timeline.push(trainingLoop);

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <p>Maintenant les essais durent un peu plus longtemps (30s).</p>
  <p>Comme à l'entraînement, comptez les rebonds des 4 ronds <strong>les plus lents</strong> contre les bords.</p>
  <p>Mais maintenant, on vous demande en plus de votre précision, de répondre <strong>le plus vite possible!</strong></p>
  <p>(Vos temps de réponse sont aussi mesurés.)</p>
  `,
  choices: ["Ok"],
  data: {
    speedcondition: speedcondition
  }
});

function adjustCanvasSize() {
  const canvas = document.getElementById("animationCanvas");
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.width = "800px";
  canvas.style.height = "600px";
}

// Global variables for trial 3 looping
let trial3Attempts = 0;
let lastTrial3Response = null;

for (let trialIndex = 1; trialIndex <= 5; trialIndex++) {
  let blackReboundsGroup1 = 0;
  let blackReboundsGroup2 = 0;

  // Define trial 3 timeline separately for looping
  if (trialIndex === 3) {
    let trial3Timeline = [];

    // Début de l'essai 3
    trial3Timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: `
      <p><strong>On y va ?</strong> C'est parti !</p>`,
      choices: ["Allez !"],
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        speedcondition: speedcondition
      }
    });

    // Animation pour l'essai 3
    trial3Timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
      <canvas id="animationCanvas"></canvas>
      `,
      choices: "NO_KEYS",
      trial_duration: 30000,
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        speedcondition: speedcondition
      },
      on_load: function () {
        adjustCanvasSize();
        let startTime = performance.now();
        let canvas = document.getElementById("animationCanvas");
        let ctx = canvas.getContext("2d");
        canvas.style.backgroundColor = "#525252";
        let shapes = [];
        let isPaused = true;
        let baseRadius = 20;
        let diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
        let unexpectedCircle = {
          x: canvas.width + 20,
          y: canvas.height / 2,
          speed: unexpectedCircleSpeed, // Utiliser la vitesse selon la condition
          active: true,
          radius: baseRadius
        };

        for (let j = 0; j < 8; j++) {
          let speed,
          group;
          if (j < 4) {
            speed = 80;
            group = 1;
          } else {
            speed = 200;
            group = 2;
          }
          let angle = Math.random() * 2 * Math.PI;
          let offset = baseRadius * 2;

          shapes.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * offset,
            y: canvas.height / 2 + (Math.random() - 0.5) * offset,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            color: "black",
            type: "circle",
            radius: baseRadius,
            group: group
          });
        }

        function updateShapes(dt) {
          if (isPaused) return;
          shapes.forEach(shape => {
            shape.x += shape.dx * dt;
            shape.y += shape.dy * dt;

            if (shape.x - shape.radius / 2 <= 0) {
              shape.x = shape.radius / 2;
              shape.dx *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            } else if (shape.x + shape.radius / 2 >= canvas.width) {
              shape.x = canvas.width - shape.radius / 2;
              shape.dx *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            }

            if (shape.y - shape.radius / 2 <= 0) {
              shape.y = shape.radius / 2;
              shape.dy *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            } else if (shape.y + shape.radius / 2 >= canvas.height) {
              shape.y = canvas.height - shape.radius / 2;
              shape.dy *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            }
          });

          if (unexpectedCircle.active && performance.now() - startTime > 10000) {
            unexpectedCircle.x += unexpectedCircle.speed * dt;
          }
        }

        function drawShapes() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          shapes.forEach(shape => {
            ctx.fillStyle = shape.color;
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.radius / 2, 0, Math.PI * 2);
            ctx.fill();
          });
          if (unexpectedCircle.active && performance.now() - startTime > 10000) {
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(unexpectedCircle.x, unexpectedCircle.y, unexpectedCircle.radius / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "black";
          ctx.font = "40px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", canvas.width / 2, canvas.height / 2);
        }

        let lastFrameTime = performance.now();
        function animate() {
          let now = performance.now();
          let deltaTime = (now - lastFrameTime) / 1000;
          lastFrameTime = now;
          updateShapes(deltaTime);
          drawShapes();
          requestAnimationFrame(animate);
        }

        setTimeout(() => {
          isPaused = false;
          startTime = performance.now();
        }, 500);

        setTimeout(() => {
          isPaused = true;
        }, 29500);

        animate();
      },
      on_finish: function (data) {
        data.rebounds_slow = blackReboundsGroup1;
        data.rebounds_fast = blackReboundsGroup2;
        data.refresh_rate = refreshRate;
        blackReboundsGroup1 = 0;
        blackReboundsGroup2 = 0;
      }
    });

    // Question sur le comptage des rebonds
    trial3Timeline.push({
      type: jsPsychSurveyText,
      preamble: `<p>Combien de rebonds des 4 ronds lents avez-vous compté ?</p>`,
      questions: [{
        prompt: "Nombre de rebonds :",
        placeholder: "",
        required: true
      }],
      button_label: "Valider",
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        speedcondition: speedcondition
      },
      on_finish: function (data) {
        data.participant_rebound_count = data.response.Q0;
      }
    });

    // Question 1 - Vue d'un objet inhabituel
    trial3Timeline.push({
      type: jsPsychSurveyMultiChoice,
      questions: [{
        prompt: "Avez-vous vu quelque chose d'inhabituel sur cet essai ?",
        options: ["OUI",
          "NON"],
        required: true
      }],
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        speedcondition: speedcondition
      },
      on_finish: function (data) {
        data.participant_response_1 = data.response.Q0;
        lastTrial3Response = data.response.Q0;
      }
    });

    // Ensure global variable is declared at the top of your script
    let selectedMotionGlobal = null; // Must be at the top of your code

    // Question sur le mouvement
    let motionQuestion = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
      <p><strong>Il y avait bien quelque chose : un rond supplémentaire !</strong>
      <p>Mais comment se déplaçait cet objet ? Cliquez sur une animation pour choisir.</p>
      <div style="display: grid; grid-template-columns: 339px 339px; grid-gap: 10px; justify-content: center;">
      <canvas id="motion1" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      <canvas id="motion2" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      <canvas id="motion3" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      <canvas id="motion4" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      </div>
      `,
      choices: ["Valider"],
      button_html: '<button class="jspsych-btn" disabled>%choice%</button>',
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        speedcondition: speedcondition,
        participant_response_4: null
      },
      on_load: function () {
        let selectedMotion = null; // Local variable
        const validateButton = document.querySelector(".jspsych-btn");

        const motionTypes = jsPsych.randomization.shuffle([
          "right_to_left",
          "vertical",
          "diagonal",
          "random"
        ]);
        const canvasIds = ["motion1", "motion2", "motion3", "motion4"];
        console.log(`[MotionQuestion] Shuffled motionTypes: ${motionTypes}`);

        function initMotion(canvasId,
          motionType) {
          let canvas = document.getElementById(canvasId);
          let ctx = canvas.getContext("2d");
          canvas.style.backgroundColor = "#525252";
          let baseRadius = 10;
          let diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
          let circle = {
            x: 0,
            y: 0,
            radius: baseRadius,
            color: "black",
            speed: 0,
            dx: 0,
            dy: 0
          };
          let isPaused = false;
          let lastDirectionChange = performance.now();

          function resetPosition() {
            console.log(`[initMotion] Resetting position for canvas: ${canvasId}, motion: ${motionType}`);
            if (motionType === "right_to_left") {
              circle.x = canvas.width + 10;
              circle.y = canvas.height / 2;
              circle.speed = -80;
            } else if (motionType === "vertical") {
              circle.x = canvas.width / 2;
              circle.y = -10;
              circle.speed = 80;
            } else if (motionType === "diagonal") {
              circle.x = -10;
              circle.y = canvas.height / 2 - (canvas.width / 2 + 10) * (canvas.height / canvas.width);
              circle.dx = 80;
              circle.dy = 80 * (canvas.height / canvas.width);
            } else if (motionType === "random") {
              circle.x = canvas.width / 2;
              circle.y = canvas.height / 2;
              circle.dx = (Math.random() - 0.5) * 80;
              circle.dy = (Math.random() - 0.5) * 80;
            }
          }

          resetPosition();

          function update(dt) {
            if (isPaused) return;
            if (motionType === "right_to_left") {
              circle.x += circle.speed * dt;
              if (circle.x < -10) resetPosition();
            } else if (motionType === "vertical") {
              circle.y += circle.speed * dt;
              if (circle.y > canvas.height + 10) resetPosition();
            } else if (motionType === "diagonal") {
              circle.x += circle.dx * dt;
              circle.y += circle.dy * dt;
              if (circle.x > canvas.width + 10 || circle.y > canvas.height + 10) resetPosition();
            } else if (motionType === "random") {
              circle.x += circle.dx * dt;
              circle.y += circle.dy * dt;
              if (circle.x < 0 || circle.x > canvas.width || circle.y < 0 || circle.y > canvas.height) {
                circle.dx *= -1;
                circle.dy *= -1;
              }
              let now = performance.now();
              if (now - lastDirectionChange > 1000) {
                circle.dx = (Math.random() - 0.5) * diag * 0.1;
                circle.dy = (Math.random() - 0.5) * diag * 0.1;
                lastDirectionChange = now;
              }
            }
          }

          function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = circle.color;
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius / 2, 0, Math.PI * 2);
            ctx.fill();
          }

          let last = performance.now();
          function animate() {
            if (isPaused) return;
            let now = performance.now();
            let dt = (now - last) / 1000;
            last = now;
            update(dt);
            draw();
            requestAnimationFrame(animate);
          }

          canvas.addEventListener("click", () => {
            selectedMotion = motionType;
            selectedMotionGlobal = motionType;
            console.log(`[MotionQuestion] Clicked canvas: ${canvasId}, motion: ${motionType}, selectedMotionGlobal: ${selectedMotionGlobal}`);
            canvasIds.forEach(id => {
              document.getElementById(id).style.border = "1px solid black";
            });
            canvas.style.border = "2px solid green";
            validateButton.disabled = false;
            jsPsych.data.get().last(1).values()[0].participant_response_4 = motionType;
            console.log(`[MotionQuestion] Updated data participant_response_4: ${jsPsych.data.get().last(1).values()[0].participant_response_4}`);
          });

          animate();
          return () => isPaused = true;
        }

        let stop1 = initMotion("motion1", motionTypes[0]);
        let stop2 = initMotion("motion2", motionTypes[1]);
        let stop3 = initMotion("motion3", motionTypes[2]);
        let stop4 = initMotion("motion4", motionTypes[3]);

        validateButton.addEventListener("click", () => {
          stop1();
          stop2();
          stop3();
          stop4();
          console.log(`[MotionQuestion] Validate clicked, selectedMotionGlobal: ${selectedMotionGlobal}`);
        });
      },
      on_finish: function (data) {
        console.log(`[MotionQuestion] on_finish, selectedMotionGlobal: ${selectedMotionGlobal}, participant_response_4: ${data.participant_response_4}`);
        if (data.participant_response_4 === undefined || data.participant_response_4 === null) {
          data.participant_response_4 = null;
        }
      }
    };
    // Échelle de certitude pour le mouvement
    let confidenceQuestion = {
      type: jsPsychHtmlSliderResponse,
      stimulus: "Êtes-vous sûr.e qu'il se <strong>déplaçait</strong> comme ça ?<br>Avec le curseur, indiquez votre niveau de certitude.</br>",
      labels: ["NON, j'ai des doutes...",
        "OUI, je suis sûr.e !"],
      min: 0,
      max: 100,
      step: 1,
      slider_start: 50,
      require_movement: true,
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        question_type: "confiance_mouvement",
        speedcondition: speedcondition
      },
      on_finish: function (data) {
        data.participant_response_4_confidence = data.response;
      }
    };

    // Question sur la vitesse
    let speedQuestion = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
      <p><strong>À quelle vitesse se déplaçait ce rond supplémentaire ?</strong></p>
      <p>Cliquez sur une animation pour choisir.</p>
      <div style="display: grid; grid-template-columns: 339px 339px; grid-gap: 10px; justify-content: center;">
      <canvas id="speed1" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      <canvas id="speed2" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      <canvas id="speed3" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      <canvas id="speed4" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
      </div>
      `,
      choices: ["Valider"],
      button_html: '<button class="jspsych-btn" disabled>%choice%</button>',
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        speedcondition: speedcondition,
        participant_response_speed: null
      },
      on_load: function () {
        let selectedSpeed = null;
        const validateButton = document.querySelector(".jspsych-btn");

        let selectedMotion = selectedMotionGlobal;
        console.log(`[SpeedQuestion] on_load, selectedMotionGlobal: ${selectedMotionGlobal}, using motion: ${selectedMotion}`);
        if (!selectedMotion) {
          console.warn(`[SpeedQuestion] Warning: selectedMotionGlobal is ${selectedMotionGlobal}. Defaulting to right_to_left.`);
          selectedMotion = "right_to_left";
        }

        const speedTypes = jsPsych.randomization.shuffle(["very_slow", "slow", "fast", "very_fast"]);
        const canvasIds = ["speed1",
          "speed2",
          "speed3",
          "speed4"];

        function initSpeed(canvasId, speedType, selectedMotion) {
          let canvas = document.getElementById(canvasId);
          if (!canvas) {
            console.error(`[initSpeed] Canvas ${canvasId} not found!`);
            return;
          }
          let ctx = canvas.getContext("2d");
          canvas.style.backgroundColor = "#525252";
          let baseRadius = 10;
          let diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
          let circle = {
            x: 0,
            y: 0,
            radius: baseRadius,
            color: "black",
            speed: 0,
            dx: 0,
            dy: 0
          };
          let isPaused = false;
          let lastDirectionChange = performance.now();

          let speedMultiplier;
          switch (speedType) {
            case "very_slow": speedMultiplier = 20; break;
            case "slow": speedMultiplier = 40; break;
            case "fast": speedMultiplier = 100; break;
            case "very_fast": speedMultiplier = 150; break;
          }

          function resetPosition() {
            console.log(`[initSpeed] Resetting position for canvas: ${canvasId}, motion: ${selectedMotion}, speedType: ${speedType}, speedMultiplier: ${speedMultiplier}`);
            if (selectedMotion === "right_to_left") {
              circle.x = canvas.width + 10;
              circle.y = canvas.height / 2;
              circle.speed = -speedMultiplier;
              circle.dx = 0;
              circle.dy = 0;
            } else if (selectedMotion === "vertical") {
              circle.x = canvas.width / 2;
              circle.y = -10;
              circle.speed = speedMultiplier;
              circle.dx = 0;
              circle.dy = 0;
            } else if (selectedMotion === "diagonal") {
              circle.x = -10;
              circle.y = canvas.height / 2 - (canvas.width / 2 + 10) * (canvas.height / canvas.width);
              circle.dx = speedMultiplier;
              circle.dy = speedMultiplier * (canvas.height / canvas.width);
              circle.speed = 0;
            } else if (selectedMotion === "random") {
              circle.x = canvas.width / 2;
              circle.y = canvas.height / 2;
              circle.dx = (Math.random() - 0.5) * speedMultiplier;
              circle.dy = (Math.random() - 0.5) * speedMultiplier;
              circle.speed = 0;
            } else {
              console.error(`[initSpeed] Invalid selectedMotion: ${selectedMotion}. Defaulting to right_to_left.`);
              circle.x = canvas.width + 10;
              circle.y = canvas.height / 2;
              circle.speed = -speedMultiplier;
              circle.dx = 0;
              circle.dy = 0;
            }
          }

          resetPosition();

          function update(dt) {
            if (isPaused) return;
            if (selectedMotion === "right_to_left") {
              circle.x += circle.speed * dt;
              if (circle.x < -10) resetPosition();
            } else if (selectedMotion === "vertical") {
              circle.y += circle.speed * dt;
              if (circle.y > canvas.height + 10) resetPosition();
            } else if (selectedMotion === "diagonal") {
              circle.x += circle.dx * dt;
              circle.y += circle.dy * dt;
              if (circle.x > canvas.width + 10 || circle.y > canvas.height + 10) resetPosition();
            } else if (selectedMotion === "random") {
              circle.x += circle.dx * dt;
              circle.y += circle.dy * dt;
              if (circle.x < 0 || circle.x > canvas.width || circle.y < 0 || circle.y > canvas.height) {
                circle.dx *= -1;
                circle.dy *= -1;
              }
              let now = performance.now();
              if (now - lastDirectionChange > 1000) {
                circle.dx = (Math.random() - 0.5) * speedMultiplier;
                circle.dy = (Math.random() - 0.5) * speedMultiplier;
                lastDirectionChange = now;
              }
            }
          }

          function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = circle.color;
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius / 2, 0, Math.PI * 2);
            ctx.fill();
          }

          let last = performance.now();
          function animate() {
            if (isPaused) return;
            let now = performance.now();
            let dt = (now - last) / 1000;
            last = now;
            update(dt);
            draw();
            requestAnimationFrame(animate);
          }

          canvas.addEventListener("click", () => {
            selectedSpeed = speedType;
            canvasIds.forEach(id => {
              document.getElementById(id).style.border = "1px solid black";
            });
            canvas.style.border = "2px solid green";
            validateButton.disabled = false;
            jsPsych.data.get().last(1).values()[0].participant_response_speed = speedType;
            console.log(`[SpeedQuestion] Selected speed: ${speedType} for canvas: ${canvasId}`);
          });

          animate();
          return () => isPaused = true;
        }

        let stop1 = initSpeed("speed1", speedTypes[0], selectedMotion);
        let stop2 = initSpeed("speed2", speedTypes[1], selectedMotion);
        let stop3 = initSpeed("speed3", speedTypes[2], selectedMotion);
        let stop4 = initSpeed("speed4", speedTypes[3], selectedMotion);

        validateButton.addEventListener("click", () => {
          stop1();
          stop2();
          stop3();
          stop4();
          console.log(`[SpeedQuestion] Validate clicked, selectedMotionGlobal: ${selectedMotionGlobal}, selectedSpeed: ${selectedSpeed}`);
        });
      },
      on_finish: function (data) {
        if (data.participant_response_speed === undefined || data.participant_response_speed === null) {
          data.participant_response_speed = null;
        }
        console.log(`[SpeedQuestion] on_finish, participant_response_speed: ${data.participant_response_speed}`);
      }
    };
    // Échelle de certitude pour la vitesse
    let speedConfidenceQuestion = {
      type: jsPsychHtmlSliderResponse,
      stimulus: "Êtes-vous sûr.e de la <strong>vitesse</strong> que vous avez choisie pour ce rond ?<br>Avec le curseur, indiquez votre niveau de certitude.</br>",
      labels: ["NON, j'ai des doutes...",
        "OUI, je suis sûr.e !"],
      min: 0,
      max: 100,
      step: 1,
      slider_start: 50,
      require_movement: true,
      data: {
        trial_number: 3,
        attempt_number: function () {
          return trial3Attempts + 1;
        },
        question_type: "confiance_vitesse",
        speedcondition: speedcondition
      },
      on_finish: function (data) {
        data.participant_response_speed_confidence = data.response;
      }
    };

    // Questions conditionnelles pour l'essai 3
    trial3Timeline.push({
      timeline: [motionQuestion],
      conditional_function: function () {
        return lastTrial3Response === "OUI";
      }
    });

    trial3Timeline.push({
      timeline: [confidenceQuestion],
      conditional_function: function () {
        return lastTrial3Response === "OUI";
      }
    });

    trial3Timeline.push({
      timeline: [speedQuestion],
      conditional_function: function () {
        return lastTrial3Response === "OUI";
      }
    });

    trial3Timeline.push({
      timeline: [speedConfidenceQuestion],
      conditional_function: function () {
        return lastTrial3Response === "OUI";
      }
    });

    // Boucle pour l'essai 3
    let trial3Loop = {
      timeline: trial3Timeline,
      loop_function: function () {
        if (lastTrial3Response === "OUI") {
          trial3Attempts = 0;
          lastTrial3Response = null;
          selectedMotionGlobal = null; // Reset
          return false;
        }
        if (trial3Attempts >= 2) {
          trial3Attempts = 0;
          lastTrial3Response = null;
          selectedMotionGlobal = null; // Reset
          return false;
        }
        trial3Attempts++;
        return true;
      }
    };
    timeline.push(trial3Loop);
  } else {
    // Trials 1, 2, 4, and 5
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: `
      <p>${trialIndex < 5 ? "<strong>On y va ?</strong> C'est parti !": "Maintenant la consigne change: Observez simplement l'écran, <strong>plus besoin de compter.</strong> C'est parti !"}</p>`,
      choices: ["Allez !"],
      data: {
        trial_number: trialIndex,
        speedcondition: speedcondition
      }
    });

    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
      <canvas id="animationCanvas"></canvas>
      `,
      choices: "NO_KEYS",
      trial_duration: 30000,
      data: {
        trial_number: trialIndex,
        speedcondition: speedcondition
      },
      on_load: function () {
        adjustCanvasSize();
        let startTime = performance.now();
        let canvas = document.getElementById("animationCanvas");
        let ctx = canvas.getContext("2d");
        canvas.style.backgroundColor = "#525252";
        let shapes = [];
        let isPaused = true;
        let baseRadius = 20;
        let diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
        let unexpectedCircle = {
          x: canvas.width + 20,
          y: canvas.height / 2,
          speed: unexpectedCircleSpeed, // Utiliser la vitesse selon la condition
          active: trialIndex >= 3,
          radius: baseRadius
        };

        for (let j = 0; j < 8; j++) {
          let speed,
          group;
          if (j < 4) {
            speed = 80;
            group = 1;
          } else {
            speed = 200;
            group = 2;
          }
          let angle = Math.random() * 2 * Math.PI;
          let offset = baseRadius * 2;

          shapes.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * offset,
            y: canvas.height / 2 + (Math.random() - 0.5) * offset,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            color: "black",
            type: "circle",
            radius: baseRadius,
            group: group
          });
        }

        function updateShapes(dt) {
          if (isPaused) return;
          shapes.forEach(shape => {
            shape.x += shape.dx * dt;
            shape.y += shape.dy * dt;

            if (shape.x - shape.radius / 2 <= 0) {
              shape.x = shape.radius / 2;
              shape.dx *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            } else if (shape.x + shape.radius / 2 >= canvas.width) {
              shape.x = canvas.width - shape.radius / 2;
              shape.dx *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            }

            if (shape.y - shape.radius / 2 <= 0) {
              shape.y = shape.radius / 2;
              shape.dy *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            } else if (shape.y + shape.radius / 2 >= canvas.height) {
              shape.y = canvas.height - shape.radius / 2;
              shape.dy *= -1;
              if (shape.group === 1) blackReboundsGroup1++;
              else blackReboundsGroup2++;
            }
          });

          if (unexpectedCircle.active && performance.now() - startTime > 10000) {
            unexpectedCircle.x += unexpectedCircle.speed * dt;
          }
        }

        function drawShapes() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          shapes.forEach(shape => {
            ctx.fillStyle = shape.color;
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.radius / 2, 0, Math.PI * 2);
            ctx.fill();
          });
          if (unexpectedCircle.active && performance.now() - startTime > 10000) {
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(unexpectedCircle.x, unexpectedCircle.y, unexpectedCircle.radius / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "black";
          ctx.font = "40px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", canvas.width / 2, canvas.height / 2);
        }

        let lastFrameTime = performance.now();
        function animate() {
          let now = performance.now();
          let deltaTime = (now - lastFrameTime) / 1000;
          lastFrameTime = now;
          updateShapes(deltaTime);
          drawShapes();
          requestAnimationFrame(animate);
        }

        setTimeout(() => {
          isPaused = false;
          startTime = performance.now();
        }, 500);

        setTimeout(() => {
          isPaused = true;
        }, 29500);

        animate();
      },
      on_finish: function (data) {
        data.rebounds_slow = blackReboundsGroup1;
        data.rebounds_fast = blackReboundsGroup2;
        data.refresh_rate = refreshRate;
      }
    });

    if (trialIndex < 5) {
      timeline.push({
        type: jsPsychSurveyText,
        preamble: `Combien de rebonds des 4 ronds lents avez-vous compté ?</p>`,
        questions: [{
          prompt: "Nombre de rebonds :",
          placeholder: "",
          required: true
        }],
        button_label: "Valider",
        data: {
          trial_number: trialIndex,
          speedcondition: speedcondition
        },
        on_finish: function (data) {
          data.participant_rebound_count = data.response.Q0;
        }
      });
    }

    if (trialIndex >= 4) {
      // Question 1 - Vue d'un objet inhabituel
      timeline.push({
        type: jsPsychSurveyMultiChoice,
        questions: [{
          prompt: "Avez-vous vu quelque chose d'inhabituel sur cet essai ?",
          options: ["OUI", "NON"],
          required: true
        }],
        data: {
          trial_number: trialIndex,
          speedcondition: speedcondition
        },
        on_finish: function (data) {
          data.participant_response_1 = data.response.Q0;
        }
      });

      let motionQuestion = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
        <p><strong>Il y avait bien quelque chose : un rond supplémentaire !</strong>
        <p>Mais comment se déplaçait cet objet ? Cliquez sur une animation pour choisir.</p>
        <div style="display: grid; grid-template-columns: 339px 339px; grid-gap: 10px; justify-content: center;">
        <canvas id="motion1" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        <canvas id="motion2" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        <canvas id="motion3" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        <canvas id="motion4" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        </div>
        `,
        choices: ["Valider"],
        button_html: '<button class="jspsych-btn" disabled>%choice%</button>',
        data: {
          trial_number: trialIndex,
          speedcondition: speedcondition,
          participant_response_4: null // Initialize in data object
        },
        on_load: function () {
          let selectedMotion = null; // Local variable for this trial
          const validateButton = document.querySelector(".jspsych-btn");

          const motionTypes = jsPsych.randomization.shuffle([
            "right_to_left",
            "vertical",
            "diagonal",
            "random"
          ]);
          const canvasIds = ["motion1",
            "motion2",
            "motion3",
            "motion4"];

          function initMotion(canvasId, motionType) {
            let canvas = document.getElementById(canvasId);
            let ctx = canvas.getContext("2d");
            canvas.style.backgroundColor = "#525252";
            let baseRadius = 10;
            let diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
            let circle = {
              x: 0,
              y: 0,
              radius: baseRadius,
              color: "black"
            };
            let isPaused = false;
            let lastDirectionChange = performance.now();

            function resetPosition() {
              if (motionType === "right_to_left") {
                circle.x = canvas.width + 10;
                circle.y = canvas.height / 2;
                circle.speed = -80;
              } else if (motionType === "vertical") {
                circle.x = canvas.width / 2;
                circle.y = -10;
                circle.speed = 80;
              } else if (motionType === "diagonal") {
                circle.x = -10;
                circle.y = canvas.height / 2 - (canvas.width / 2 + 10) * (canvas.height / canvas.width);
                circle.dx = 80;
                circle.dy = 80 * (canvas.height / canvas.width);
              } else if (motionType === "random") {
                circle.x = canvas.width / 2;
                circle.y = canvas.height / 2;
                circle.dx = (Math.random() - 0.5) * 80;
                circle.dy = (Math.random() - 0.5) * 80;
              }
            }

            resetPosition();

            function update(dt) {
              if (isPaused) return;
              if (motionType === "right_to_left") {
                circle.x += circle.speed * dt;
                if (circle.x < -10) resetPosition();
              } else if (motionType === "vertical") {
                circle.y += circle.speed * dt;
                if (circle.y > canvas.height + 10) resetPosition();
              } else if (motionType === "diagonal") {
                circle.x += circle.dx * dt;
                circle.y += circle.dy * dt;
                if (circle.x > canvas.width + 10 || circle.y > canvas.height + 10) resetPosition();
              } else if (motionType === "random") {
                circle.x += circle.dx * dt;
                circle.y += circle.dy * dt;
                if (circle.x < 0 || circle.x > canvas.width || circle.y < 0 || circle.y > canvas.height) {
                  circle.dx *= -1;
                  circle.dy *= -1;
                }
                let now = performance.now();
                if (now - lastDirectionChange > 1000) {
                  circle.dx = (Math.random() - 0.5) * diag * 0.1;
                  circle.dy = (Math.random() - 0.5) * diag * 0.1;
                  lastDirectionChange = now;
                }
              }
            }

            function draw() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = circle.color;
              ctx.beginPath();
              ctx.arc(circle.x, circle.y, circle.radius / 2, 0, Math.PI * 2);
              ctx.fill();
            }

            let last = performance.now();
            function animate() {
              if (isPaused) return;
              let now = performance.now();
              let dt = (now - last) / 1000;
              last = now;
              update(dt);
              draw();
              requestAnimationFrame(animate);
            }

            canvas.addEventListener("click", () => {
              selectedMotion = motionType;
              selectedMotionGlobal = motionType;
              canvasIds.forEach(id => {
                document.getElementById(id).style.border = "1px solid black";
              });
              canvas.style.border = "2px solid green";
              validateButton.disabled = validateButton.disabled && false;
              // Store the selection in the trial's data
              jsPsych.data.get().last(1).values()[0].participant_response_4 = motionType;
            });

            animate();
            return () => isPaused = true;
          }

          let stop1 = initMotion("motion1", motionTypes[0]);
          let stop2 = initMotion("motion2", motionTypes[1]);
          let stop3 = initMotion("motion3", motionTypes[2]);
          let stop4 = initMotion("motion4", motionTypes[3]);

          validateButton.addEventListener("click", () => {
            stop1();
            stop2();
            stop3();
            stop4();
          });
        },
        on_finish: function (data) {
          if (data.participant_response_4 === undefined || data.participant_response_4 === null) {
            data.participant_response_4 = null;
          }
        }
      };

      // Confidence question
      let confidenceQuestion = {
        type: jsPsychHtmlSliderResponse,
        stimulus: "Êtes-vous sûr.e qu'il se <strong>déplaçait</strong> comme ça ?<br>Avec le curseur, indiquez votre niveau de certitude.</br>",
        labels: ["NON, j'ai des doutes...",
          "OUI, je suis sûr.e !"],
        min: 0,
        max: 100,
        step: 1,
        slider_start: 50,
        require_movement: true,
        data: {
          trial_number: trialIndex,
          question_type: "confiance_mouvement",
          speedcondition: speedcondition
        },
        on_finish: function (data) {
          data.participant_response_4_confidence = data.response;
        }
      };

      let speedQuestion = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
        <p><strong>À quelle vitesse se déplaçait ce rond supplémentaire ?</strong></p>
        <p>Cliquez sur une animation pour choisir.</p>
        <div style="display: grid; grid-template-columns: 339px 339px; grid-gap: 10px; justify-content: center;">
        <canvas id="speed1" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        <canvas id="speed2" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        <canvas id="speed3" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        <canvas id="speed4" width="324" height="216" style="border: 1px solid black; cursor: pointer;"></canvas>
        </div>
        `,
        choices: ["Valider"],
        button_html: '<button class="jspsych-btn" disabled>%choice%</button>',
        data: {
          trial_number: trialIndex,
          speedcondition: speedcondition,
          participant_response_speed: null
        },
        on_load: function () {
          let selectedSpeed = null;
          const validateButton = document.querySelector(".jspsych-btn");

          let selectedMotion = selectedMotionGlobal;
          console.log(`[SpeedQuestion] on_load, selectedMotionGlobal: ${selectedMotionGlobal}, using motion: ${selectedMotion}`);
          if (!selectedMotion) {
            console.warn(`[SpeedQuestion] Warning: selectedMotionGlobal is ${selectedMotionGlobal}. Defaulting to right_to_left.`);
            selectedMotion = "right_to_left";
          }

          const speedTypes = jsPsych.randomization.shuffle(["very_slow", "slow", "fast", "very_fast"]);
          const canvasIds = ["speed1",
            "speed2",
            "speed3",
            "speed4"];

          function initSpeed(canvasId, speedType, selectedMotion) {
            let canvas = document.getElementById(canvasId);
            if (!canvas) {
              console.error(`[initSpeed] Canvas ${canvasId} not found!`);
              return;
            }
            let ctx = canvas.getContext("2d");
            canvas.style.backgroundColor = "#525252";
            let baseRadius = 10;
            let diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
            let circle = {
              x: 0,
              y: 0,
              radius: baseRadius,
              color: "black",
              speed: 0,
              dx: 0,
              dy: 0
            };
            let isPaused = false;
            let lastDirectionChange = performance.now();

            let speedMultiplier;
            switch (speedType) {
              case "very_slow": speedMultiplier = 20; break;
              case "slow": speedMultiplier = 40; break;
              case "fast": speedMultiplier = 100; break;
              case "very_fast": speedMultiplier = 150; break;
            }

            function resetPosition() {
              console.log(`[initSpeed] Resetting position for canvas: ${canvasId}, motion: ${selectedMotion}, speedType: ${speedType}, speedMultiplier: ${speedMultiplier}`);
              if (selectedMotion === "right_to_left") {
                circle.x = canvas.width + 10;
                circle.y = canvas.height / 2;
                circle.speed = -speedMultiplier;
                circle.dx = 0;
                circle.dy = 0;
              } else if (selectedMotion === "vertical") {
                circle.x = canvas.width / 2;
                circle.y = -10;
                circle.speed = speedMultiplier;
                circle.dx = 0;
                circle.dy = 0;
              } else if (selectedMotion === "diagonal") {
                circle.x = -10;
                circle.y = canvas.height / 2 - (canvas.width / 2 + 10) * (canvas.height / canvas.width);
                circle.dx = speedMultiplier;
                circle.dy = speedMultiplier * (canvas.height / canvas.width);
                circle.speed = 0;
              } else if (selectedMotion === "random") {
                circle.x = canvas.width / 2;
                circle.y = canvas.height / 2;
                circle.dx = (Math.random() - 0.5) * speedMultiplier;
                circle.dy = (Math.random() - 0.5) * speedMultiplier;
                circle.speed = 0;
              } else {
                console.error(`[initSpeed] Invalid selectedMotion: ${selectedMotion}. Defaulting to right_to_left.`);
                circle.x = canvas.width + 10;
                circle.y = canvas.height / 2;
                circle.speed = -speedMultiplier;
                circle.dx = 0;
                circle.dy = 0;
              }
            }

            resetPosition();

            function update(dt) {
              if (isPaused) return;
              if (selectedMotion === "right_to_left") {
                circle.x += circle.speed * dt;
                if (circle.x < -10) resetPosition();
              } else if (selectedMotion === "vertical") {
                circle.y += circle.speed * dt;
                if (circle.y > canvas.height + 10) resetPosition();
              } else if (selectedMotion === "diagonal") {
                circle.x += circle.dx * dt;
                circle.y += circle.dy * dt;
                if (circle.x > canvas.width + 10 || circle.y > canvas.height + 10) resetPosition();
              } else if (selectedMotion === "random") {
                circle.x += circle.dx * dt;
                circle.y += circle.dy * dt;
                if (circle.x < 0 || circle.x > canvas.width || circle.y < 0 || circle.y > canvas.height) {
                  circle.dx *= -1;
                  circle.dy *= -1;
                }
                let now = performance.now();
                if (now - lastDirectionChange > 1000) {
                  circle.dx = (Math.random() - 0.5) * speedMultiplier;
                  circle.dy = (Math.random() - 0.5) * speedMultiplier;
                  lastDirectionChange = now;
                }
              }
            }

            function draw() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = circle.color;
              ctx.beginPath();
              ctx.arc(circle.x, circle.y, circle.radius / 2, 0, Math.PI * 2);
              ctx.fill();
            }

            let last = performance.now();
            function animate() {
              if (isPaused) return;
              let now = performance.now();
              let dt = (now - last) / 1000;
              last = now;
              update(dt);
              draw();
              requestAnimationFrame(animate);
            }

            canvas.addEventListener("click", () => {
              selectedSpeed = speedType;
              canvasIds.forEach(id => {
                document.getElementById(id).style.border = "1px solid black";
              });
              canvas.style.border = "2px solid green";
              validateButton.disabled = false;
              jsPsych.data.get().last(1).values()[0].participant_response_speed = speedType;
              console.log(`[SpeedQuestion] Selected speed: ${speedType} for canvas: ${canvasId}`);
            });

            animate();
            return () => isPaused = true;
          }

          let stop1 = initSpeed("speed1", speedTypes[0], selectedMotion);
          let stop2 = initSpeed("speed2", speedTypes[1], selectedMotion);
          let stop3 = initSpeed("speed3", speedTypes[2], selectedMotion);
          let stop4 = initSpeed("speed4", speedTypes[3], selectedMotion);

          validateButton.addEventListener("click", () => {
            stop1();
            stop2();
            stop3();
            stop4();
            console.log(`[SpeedQuestion] Validate clicked, selectedMotionGlobal: ${selectedMotionGlobal}, selectedSpeed: ${selectedSpeed}`);
          });
        },
        on_finish: function (data) {
          if (data.participant_response_speed === undefined || data.participant_response_speed === null) {
            data.participant_response_speed = null;
          }
          console.log(`[SpeedQuestion] on_finish, participant_response_speed: ${data.participant_response_speed}`);
        }
      };
      // Speed confidence question
      let speedConfidenceQuestion = {
        type: jsPsychHtmlSliderResponse,
        stimulus: "Êtes-vous sûr.e de la <strong>vitesse</strong> que vous avez choisie pour ce rond ?<br>Avec le curseur, indiquez votre niveau de certitude.</br>",
        labels: ["NON, j'ai des doutes...",
          "OUI, je suis sûr.e !"],
        min: 0,
        max: 100,
        step: 1,
        slider_start: 50,
        require_movement: true,
        data: {
          trial_number: trialIndex,
          question_type: "confiance_vitesse",
          speedcondition: speedcondition
        },
        on_finish: function (data) {
          data.participant_response_speed_confidence = data.response;
        }
      };
      timeline.push({
        type: jsPsychCallFunction,
        func: function () {
          selectedMotionGlobal = null; // Reset after each trial
        }
      });

      // Add questions for trials 4 and 5
      timeline.push(motionQuestion);
      timeline.push(confidenceQuestion);
      timeline.push(speedQuestion);
      timeline.push(speedConfidenceQuestion);
    }
  }
}
timeline.push({
  type: jsPsychSurveyMultiChoice,
  questions: [{
    prompt: "Avez-vous déjà eu connaissance de ce type d'expérience ? Par exemple, connaissez-vous la vidéo du gorille et des basketeurs ?",
    options: ["Oui", "Non"],
    required: true
  }],
  button_label: "Valider",
  data: {
    question_type: "prior_knowledge",
    speedcondition: speedcondition
  },
  on_finish: function (data) {
    data.participant_prior_knowledge = data.response.Q0;
  }
});

timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `<p>L'expérience est terminée. <strong>Merci pour votre participation !</strong> <br>Si on vous demande si vous voulez quitter la page, vous pouvez!</br> Vos données ont bien été sauvegardées!</p>
  <p>Appuyez sur une touche pour quitter.</p>`,
  choices: "ALL_KEYS",
  data: {
    speedcondition: speedcondition
  },
  on_finish: function () {
    if (document.fullscreenElement) document.exitFullscreen();
    window.location.href = "https://www.univ-tlse2.fr/";
  }
});

jsPsych.run(timeline);