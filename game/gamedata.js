// === AI Ethics Quest - Game Data ===
// All content derived from Module 15: Explainability and Fairness

const GAME_DATA = {

  // ============================================================
  // ADVENTURE MODE - Story-driven scenarios
  // ============================================================
  adventure: [
    // Chapter 1: The Hospital
    {
      chapter: 1,
      title: "The Hospital AI Audit",
      scenes: [
        {
          narrative: `<h3>Chapter 1: The Hospital</h3>
            <p>You're an AI auditor called to <span class="highlight">City General Hospital</span>. Their new heart disease prediction model has been making recommendations, but some doctors don't trust it.</p>
            <p>Dr. Patel approaches you: <em>"We trained a logistic regression model on patient data. It uses features like chest pain type, cholesterol, and exercise metrics. But I need to understand <strong>why</strong> it flags certain patients as high-risk."</em></p>
            <p>She shows you the model's coefficients. The feature <code>oldpeak</code> has a <strong>negative coefficient</strong>.</p>
            <p><em>"A patient with higher <code>oldpeak</code> came in. What does the model think?"</em></p>`,
          question: "Based on the negative coefficient for oldpeak, what happens to the predicted risk when oldpeak increases?",
          choices: [
            "The patient receives higher predicted heart disease risk.",
            "The patient receives lower predicted heart disease risk.",
            "The model cannot use numeric variables to adjust risk.",
            "The effect depends entirely on categorical variables."
          ],
          correct: 1,
          explanation: "A negative coefficient in logistic regression means that as the feature value increases, the predicted log-odds decrease. So higher oldpeak leads to lower predicted risk in this model. Remember: this describes model behavior, not clinical causation.",
          trustDelta: 10,
          category: "Explainability"
        },
        {
          narrative: `<p>Dr. Patel nods. <em>"Good. Now, I also trained a shallow decision tree to see if it's more interpretable."</em></p>
            <p>She shows you a decision tree that splits on <code>thal_2</code>, <code>oldpeak</code>, <code>age</code>, and <code>cp_0</code>.</p>
            <p>A clinician asks: <em>"Why does the tree predict <strong>Disease</strong> for this particular patient?"</em></p>
            <p>You examine the tree and see the patient reaches a leaf node where most training patients had disease, following a path through conditions on <code>thal_2</code>, <code>age</code>, and <code>ca_1</code>.</p>`,
          question: "Which explanation best reflects how a decision tree justifies its prediction?",
          choices: [
            "The model predicts Disease because thal_2, age, and ca_1 are among the most important features overall.",
            "The model predicts Disease because the patient satisfies a sequence of conditions that led many similar training patients to have disease.",
            "The model predicts Disease because the combined effect of these features increases risk additively.",
            "The model predicts Disease because each feature individually points toward higher risk."
          ],
          correct: 1,
          explanation: "Decision trees explain predictions by routing a patient through a sequence of conditional rules. The prediction reflects how similar training cases were classified along the same path\u2014not a global ranking, additive combination, or individual feature effect.",
          trustDelta: 10,
          category: "Explainability"
        },
        {
          narrative: `<p>The hospital also trained a <span class="concept">Random Forest</span> model. A student doctor asks:</p>
            <p><em>"For this one patient, which features pushed the model toward predicting disease?"</em></p>
            <p>You have the Random Forest <strong>global feature importance table</strong> showing <code>oldpeak</code>, <code>thal_3</code>, and <code>cp_0</code> rank highest.</p>`,
          question: "What is the most appropriate response to the student's question?",
          choices: [
            "Use the feature importance table\u2014it already explains individual predictions.",
            "Look at the logistic regression coefficients; they are the same as Random Forest importance.",
            "Use a local explainability method (e.g., SHAP values) because global feature importance does not explain individual predictions.",
            "You can't explain Random Forest predictions."
          ],
          correct: 2,
          explanation: "Global feature importance summarizes which features matter overall, but doesn't decompose a single prediction. For patient-level explanation, you need a local method like SHAP that attributes contributions for that specific case.",
          trustDelta: 15,
          category: "Explainability"
        },
        {
          narrative: `<p>You pull up the <span class="concept">SHAP summary plot</span> for the XGBoost model. It shows feature impacts across all patients, with dots colored by feature value.</p>
            <p>Dr. Patel asks: <em>"Can you tell me why Patient #47 received a predicted probability of 0.68 from this plot?"</em></p>`,
          question: "What CANNOT be determined from a SHAP summary (beeswarm) plot alone?",
          choices: [
            "That cp_0 and ca_0 have larger overall impact than restecg_1.",
            "That higher oldpeak values tend to push predictions toward lower risk.",
            "Why a specific patient received a predicted probability of 0.68.",
            "That the effect of age varies across patients rather than having a fixed direction."
          ],
          correct: 2,
          explanation: "The SHAP summary plot shows aggregated values across all patients. It reveals global patterns but cannot explain any specific patient's prediction. You'd need a local SHAP explanation for that individual patient.",
          trustDelta: 10,
          category: "Explainability"
        },
        // INTERACTIVE: Decision Tree Tracing
        {
          type: "tree-trace",
          narrative: `<p>Dr. Patel pulls up the shallow decision tree visualization. <em>"Can you trace the path for this patient and tell me what the model predicts?"</em></p>
            <p>Click each node in the correct order to follow the patient's path through the tree!</p>`,
          patientValues: { thal_2: 0.3, oldpeak: 0.21, cp_0: 0.6 },
          treeNodes: [
            { label: "thal_2 \u2264 0.5?", condition: "Root split", depth: 0 },
            { label: "oldpeak \u2264 0.25?", condition: "Left branch", depth: 1 },
            { label: "age \u2264 0.019?", condition: "Right branch", depth: 1 },
            { label: "cp_0 \u2264 0.5?", condition: "Check chest pain", depth: 2 },
            { label: "No Disease", type: "leaf", prediction: "No Disease", depth: 3, explanation: "The patient follows: thal_2 YES \u2192 oldpeak YES \u2192 cp_0 NO \u2192 No Disease. Features not on the path (like age) don't affect this prediction." }
          ],
          correctPath: [0, 1, 3, 4],
          trustDelta: 15,
          category: "Explainability"
        },
        // INTERACTIVE: SHAP Force Plot Builder
        {
          type: "shap-build",
          narrative: `<p>Now Dr. Patel asks you to build a local SHAP explanation for Patient #47. <em>"Drag each feature onto the force plot to see how individual features push the prediction up or down."</em></p>`,
          basePrediction: 0.45,
          targetPrediction: 0.72,
          features: [
            { name: "cp_0", shapValue: 0.18 },
            { name: "ca_0", shapValue: 0.14 },
            { name: "chol", shapValue: 0.08 },
            { name: "thalach", shapValue: 0.05 },
            { name: "age", shapValue: -0.06 },
            { name: "oldpeak", shapValue: -0.06 },
            { name: "thal_3", shapValue: -0.06 }
          ],
          explanation: "Each SHAP value shows how much a feature pushes the prediction up (positive) or down (negative) from the base rate. cp_0 and ca_0 push toward disease, while thal_3 and oldpeak push away. The final prediction is the sum of all contributions.",
          trustDelta: 15,
          category: "Explainability"
        }
      ]
    },

    // Chapter 2: The Image Lab
    {
      chapter: 2,
      title: "The Image Recognition Lab",
      scenes: [
        {
          narrative: `<h3>Chapter 2: The Image Lab</h3>
            <p>Your next assignment takes you to <span class="highlight">VisionTech Labs</span>, where a team is building scene classification for autonomous vehicles.</p>
            <p>They show you a photo of Rio de Janeiro. The model's top-5 predictions are: <code>village</code>, <code>islet</code>, <code>beach_house</code>, <code>coast</code>, and <code>harbor</code>.</p>
            <p>They generate <span class="concept">Grad-CAM</span> heatmaps for different classes on the same image. The heatmaps highlight <em>different regions</em> for <code>islet</code> vs. <code>coast</code> vs. <code>beach_house</code>.</p>`,
          question: "What does it demonstrate when the same image produces different Grad-CAM heatmaps for different classes?",
          choices: [
            "The model uses a single generic feature representation regardless of class.",
            "The model associates different spatial regions with different semantic scene labels.",
            "The Grad-CAM algorithm is unstable across multiple runs.",
            "The image contains multiple objects, confusing the network."
          ],
          correct: 1,
          explanation: "Grad-CAM highlights image regions that most support a specific class score. Different regions highlighted for different labels shows the network has learned distinct visual concepts and uses them differently per class.",
          trustDelta: 10,
          category: "Explainability"
        },
        {
          narrative: `<p>The team notices that Grad-CAM overlays for <code>coast</code>, <code>harbor</code>, and <code>village</code> highlight <strong>overlapping regions</strong>\u2014particularly near the water and shoreline.</p>
            <p>An engineer panics: <em>"The model can't tell these classes apart! It highlights the same areas!"</em></p>`,
          question: "What is the best interpretation of overlapping highlighted regions across related classes?",
          choices: [
            "The model is confused and unable to distinguish between these classes.",
            "These classes share common visual features, which the model reuses while weighting them differently for each label.",
            "Grad-CAM always highlights the most visually salient region regardless of class.",
            "The model ignores class labels once the image passes through the network."
          ],
          correct: 1,
          explanation: "Scene categories like coast, harbor, and village share visual components (water, coastline, buildings). The model reuses these shared features but weights them differently per class. Overlap doesn't mean confusion.",
          trustDelta: 10,
          category: "Explainability"
        },
        {
          narrative: `<p>Looking at all five Grad-CAM visualizations, a product manager asks:</p>
            <p><em>"So these highlighted regions are the true physical causes of the scene category?"</em></p>`,
          question: "Which conclusion is NOT justified by Grad-CAM plots?",
          choices: [
            "The model relies on different image regions depending on which scene label is evaluated.",
            "The highlighted regions correspond to visually meaningful parts of the scene.",
            "The highlighted regions are visual evidence the model associates most strongly with each class.",
            "The highlighted regions are the true physical causes of the scene category in the real world."
          ],
          correct: 3,
          explanation: "Grad-CAM highlights regions important for the model's prediction, not regions causally responsible for the scene. While heatmaps often align with human intuition, they reflect learned associations, not causal explanations.",
          trustDelta: 15,
          category: "Explainability"
        }
      ]
    },

    // Chapter 3: The Spam Filter
    {
      chapter: 3,
      title: "The Spam Detection Dilemma",
      scenes: [
        {
          narrative: `<h3>Chapter 3: The Spam Filter</h3>
            <p>A messaging company hired you to audit their spam classifier. They use <span class="concept">LIME</span> to explain individual predictions.</p>
            <p>You examine a message: <em>"Security notice: unusual sign-in activity detected. Please review to keep your account active."</em></p>
            <p>LIME highlights <em>"security"</em>, <em>"account"</em>, <em>"detected"</em>, and <em>"keep your account active"</em> as pushing the prediction toward spam.</p>`,
          question: "What can you conclude from the LIME explanation? (Best answer)",
          choices: [
            "The word 'notice' alone is sufficient to trigger a spam classification.",
            "The model treats all warnings as spam by default.",
            "The prediction is driven by security-related terms combined with urgency cues, not a single trigger word.",
            "The model is confused because the sentence resembles legitimate alerts."
          ],
          correct: 2,
          explanation: "LIME shows that several security-related terms combined with urgency phrases like 'keep your account active' drive the spam prediction. It's the combination of call-to-action language, not a single word, that matters.",
          trustDelta: 10,
          category: "Explainability"
        },
        {
          narrative: `<p>Next, you examine the message: <em>"You qualify for a $25 voucher based on recent activity\u2014reply YES to receive details. Reply STOP to opt out."</em></p>
            <p>LIME highlights <em>"voucher"</em>, <em>"reply YES"</em>, and <em>"STOP"</em> as strongly increasing spam probability. The dollar amount <em>"$25"</em> has minimal weight.</p>`,
          question: "What does this LIME explanation tell us about the model?",
          choices: [
            "The model treats the dollar amount as the primary spam indicator.",
            "The prediction is driven primarily by call-to-action language, not the numerical amount.",
            "Most words in the sentence contribute equally to the spam prediction.",
            "The model cannot handle messages with opt-out language."
          ],
          correct: 1,
          explanation: "LIME concentrates weight on action-oriented tokens like 'voucher', 'reply YES', and 'STOP'. The dollar amount isn't highlighted, meaning the model responds more to response instructions than the incentive size.",
          trustDelta: 10,
          category: "Explainability"
        },
        // INTERACTIVE: LIME Word Highlighter
        {
          type: "lime-highlight",
          narrative: `<p>The team gives you a new message to analyze: <em>"Your account has been compromised. Click here immediately to verify your identity and restore access."</em></p>
            <p>LIME has identified which words push this message toward SPAM. <strong>Click the words you think LIME highlights as spam indicators!</strong></p>`,
          words: ["Your", "account", "has", "been", "compromised.", "Click", "here", "immediately", "to", "verify", "your", "identity", "and", "restore", "access."],
          highlightIndices: [4, 5, 6, 7, 9, 13, 14],
          explanation: "LIME identifies urgency cues ('compromised', 'immediately') and call-to-action phrases ('Click here', 'verify', 'restore access') as key spam indicators. Common words like 'your', 'has', 'been' have little influence on the classification.",
          trustDelta: 15,
          category: "Explainability"
        }
      ]
    },

    // Chapter 4: The Fairness Frontier
    {
      chapter: 4,
      title: "The Fairness Frontier",
      scenes: [
        {
          narrative: `<h3>Chapter 4: The Fairness Frontier</h3>
            <p>You've been called to audit a <span class="highlight">criminal justice system</span>. The COMPAS recidivism model is under scrutiny for potential racial bias.</p>
            <p>A city uses a risk model to send police patrols based on prior arrest data. Over time, <strong>Neighborhood X</strong> is policed more heavily, generating more arrests\u2014which then feed back into the model.</p>`,
          question: "What does this situation illustrate?",
          choices: [
            "Equal policing, since all neighborhoods are evaluated with the same model.",
            "Fairness through blindness, since the model doesn't use neighborhood labels directly.",
            "A feedback loop that amplifies initial disparities.",
            "Overfitting due to using too much historical arrest data."
          ],
          correct: 2,
          explanation: "This is a classic feedback loop. Increased policing leads to more observed arrests, which reinforces the model's belief that the neighborhood is high risk, causing even more policing. The data is shaped by past decisions.",
          trustDelta: 15,
          category: "Fairness"
        },
        {
          narrative: `<p>Suppose the city hypothetically freezes police patrol allocation for one year, regardless of model predictions. During that year, arrest disparities across neighborhoods <strong>decrease</strong>.</p>`,
          question: "What does this suggest about the original system?",
          choices: [
            "The model's predictions were inaccurate and needed better features.",
            "The original dataset lacked sufficient diversity.",
            "Model-driven decisions were influencing the data-generating process.",
            "The system was violating demographic parity constraints during deployment."
          ],
          correct: 2,
          explanation: "When patrol allocation is frozen, the link between prediction and data collection breaks, and disparities decrease. This indicates the original disparities were being reinforced by the system's own actions, not just underlying crime rates.",
          trustDelta: 15,
          category: "Fairness"
        },
        {
          narrative: `<p>You examine a hiring dataset. Group A receives job offers <strong>48%</strong> of the time and Group B receives offers <strong>46%</strong> of the time.</p>
            <p>The dataset is defined to be <span class="concept">\u03B1-biased</span> if the difference in offer rates between groups is at least <strong>\u03B1 = 0.05</strong>.</p>`,
          question: "Is this dataset \u03B1-biased?",
          choices: [
            "Yes, because the rates are not exactly equal.",
            "No, because the difference (0.02) is smaller than \u03B1 = 0.05.",
            "Yes, because hiring decisions involve human choices.",
            "It becomes unbiased if we train logistic regression."
          ],
          correct: 1,
          explanation: "A dataset is \u03B1-biased when the difference in positive outcome rates between groups is at least \u03B1. Here the difference is 0.48 \u2212 0.46 = 0.02. Since 0.02 < 0.05, the dataset is NOT \u03B1-biased at this threshold.",
          trustDelta: 10,
          category: "Fairness"
        },
        {
          narrative: `<p>Now consider a parole dataset where Group X gets parole <strong>35%</strong> of the time and Group Y gets parole <strong>20%</strong> of the time, with <strong>\u03B1 = 0.12</strong>.</p>`,
          question: "Is this dataset \u03B1-biased?",
          choices: [
            "No, because parole decisions are individualized.",
            "It becomes unbiased if group membership is excluded.",
            "Yes, because the difference (0.15) is at least \u03B1 = 0.12.",
            "\u03B1-bias only applies after deployment due to feedback loops."
          ],
          correct: 2,
          explanation: "The difference is 0.35 \u2212 0.20 = 0.15. Since 0.15 \u2265 0.12, the dataset IS \u03B1-biased. \u03B1-bias is about the measured outcome-rate gap, not about individual decisions or deployment timing.",
          trustDelta: 10,
          category: "Fairness"
        },
        {
          narrative: `<p>The COMPAS analysis uses <span class="concept">\u03B5-demographic parity</span> as a fairness criterion. A policymaker says:</p>
            <p><em>"To satisfy \u03B5-demographic parity, we adjusted the system so that a small number of defendants had their final risk labels changed, while keeping the underlying risk model largely intact."</em></p>`,
          question: "Which interpretation best matches the approach used?",
          choices: [
            "The model was retrained after removing race-related features.",
            "Random noise was added to risk scores until group rates aligned.",
            "Outcome labels were selectively changed as part of an optimization problem.",
            "Defendants near the risk threshold were excluded from the dataset."
          ],
          correct: 2,
          explanation: "The optimization framework enforces \u03B5-demographic parity by selectively flipping a limited number of outcomes while fitting the classifier. This directly constrains group-level decision rates rather than altering features or injecting randomness.",
          trustDelta: 15,
          category: "Fairness"
        },
        {
          narrative: `<p>Two students debate the COMPAS results:</p>
            <ul>
              <li><strong>Student A:</strong> <em>"The model is fair because Black and white defendants have similar false positive rates."</em></li>
              <li><strong>Student B:</strong> <em>"The model is fair because Black and white defendants are labeled 'high risk' at similar rates."</em></li>
            </ul>`,
          question: "If \u03B5-demographic parity is the fairness criterion, which student's reasoning aligns with it?",
          choices: [
            "Student A, because \u03B5-demographic parity focuses on error rates.",
            "Student A, because fairness requires calibration within groups.",
            "Student B, because \u03B5-demographic parity constrains the rate of positive predictions across groups.",
            "Neither, because \u03B5-demographic parity requires identical feature distributions."
          ],
          correct: 2,
          explanation: "\u03B5-demographic parity requires that the difference in positive decision rates between groups is at most \u03B5. In COMPAS, this means similar 'high risk' labeling rates. Error rates are NOT constrained by demographic parity.",
          trustDelta: 15,
          category: "Fairness"
        },
        // INTERACTIVE: Feedback Loop Breaker
        {
          type: "feedback-loop",
          narrative: `<p>You discover a feedback loop in the criminal justice system. Police patrols are allocated based on arrest data, but more patrols mean more arrests, which reinforces the model's predictions.</p>
            <p><strong>Break the cycle!</strong> Click the scissors on the connection you think should be severed to stop the feedback loop.</p>`,
          stages: [
            "Model predicts high crime",
            "More police patrols sent",
            "More arrests observed",
            "Training data updated"
          ],
          correctBreak: 0,
          explanation: "Breaking the link between 'Model predicts high crime' and 'More police patrols sent' severs the feedback loop. Freezing patrol allocation based on predictions stops the self-reinforcing cycle. The other connections are data flows that don't drive the amplification.",
          trustDelta: 15,
          category: "Fairness"
        }
      ]
    },

    // Chapter 5: The Optimization
    {
      chapter: 5,
      title: "The Price of Diversity",
      scenes: [
        {
          narrative: `<h3>Chapter 5: The Price of Diversity</h3>
            <p>You're now consulting with the university's admissions office. They want to implement <span class="concept">fairness-aware optimization</span>.</p>
            <p>The team uses a label transformation: <strong>Y'_i = Y_i(1 \u2212 2Z_i)</strong>, where Z_i is a binary variable that decides whether to flip a label.</p>`,
          question: "What is the effect of this transformation when Z_i = 0?",
          choices: [
            "The label is removed from the dataset.",
            "The label becomes zero.",
            "The label remains unchanged.",
            "The observation is ignored during training."
          ],
          correct: 2,
          explanation: "When Z_i = 0, the multiplier is (1 \u2212 0) = 1, so Y'_i = Y_i. The label stays the same. Only when Z_i = 1 does the label get flipped. This enables the optimization to choose which labels to flip for fairness.",
          trustDelta: 10,
          category: "Fairness"
        },
        {
          narrative: `<p>The optimization team asks: <em>"Why do we introduce the binary variable Z_i?"</em></p>`,
          question: "Why is the binary variable Z_i introduced in fairness-aware optimization?",
          choices: [
            "To reweight observations from underrepresented groups.",
            "To remove biased samples from the dataset.",
            "To decide which outcome labels should be flipped to achieve demographic parity.",
            "To directly modify protected attributes such as race or gender."
          ],
          correct: 2,
          explanation: "Z_i allows the optimization to choose which labels to flip to reduce disparities between groups. Protected attributes aren't modified, and observations aren't removed. Fairness is achieved by altering a limited number of labels in a controlled way.",
          trustDelta: 10,
          category: "Fairness"
        },
        {
          narrative: `<p>After running the optimization, the team trains a <span class="concept">classification tree</span> to audit which labels were flipped. The tree splits on <em>"race = minority"</em> and <em>"prior convictions > 2"</em>.</p>`,
          question: "What does this classification tree audit reveal?",
          choices: [
            "Flips are concentrated among minority individuals with multiple prior convictions.",
            "The tree shows spurious splits unrelated to flips.",
            "Flips occurred equally across all groups.",
            "The model is overfitting to noise."
          ],
          correct: 0,
          explanation: "The classification tree is trained to predict which labels were flipped. Its splits reveal patterns in the optimization's flipping decisions\u2014showing flips are systematically associated with race and prior convictions.",
          trustDelta: 15,
          category: "Fairness"
        },
        {
          narrative: `<p>Finally, the university president asks: <em>"Why does the lecture describe \u03B5-demographic parity as allowing a tunable trade-off?"</em></p>`,
          question: "Why is \u03B5 considered a tunable trade-off parameter?",
          choices: [
            "Because \u03B5 sets a tolerance on how much individual risk scores may be adjusted.",
            "Because \u03B5 determines how strongly protected attributes influence predictions.",
            "Because smaller \u03B5 enforces stricter parity at potentially higher cost to meritocracy.",
            "Because \u03B5 directly controls the model's overall classification accuracy."
          ],
          correct: 2,
          explanation: "\u03B5 acts as a policy lever controlling how strictly the model must equalize positive prediction rates across groups. Smaller \u03B5 = stricter parity, often requiring more flips and reducing merit-based distinctions. It's a quantifiable 'price of diversity.'",
          trustDelta: 15,
          category: "Fairness"
        },
        // INTERACTIVE: Spot the Bias
        {
          type: "spot-bias",
          narrative: `<p>The admissions office shares their historical dataset. You notice some patterns that suggest bias. <strong>Click the cells that show evidence of bias!</strong></p>`,
          columns: ["Applicant", "Group", "GPA", "Score", "Admitted"],
          rows: [
            ["A1", "Majority", "3.2", "72", "Yes"],
            ["A2", "Minority", "3.8", "89", "No"],
            ["A3", "Majority", "3.0", "65", "Yes"],
            ["A4", "Minority", "3.7", "85", "No"],
            ["A5", "Majority", "3.5", "78", "Yes"],
            ["A6", "Minority", "3.9", "91", "Yes"],
            ["A7", "Majority", "2.8", "60", "Yes"],
            ["A8", "Minority", "3.6", "82", "No"]
          ],
          biasCells: ["1-4", "2-4", "3-4", "6-4", "7-4"],
          explanation: "Minority applicants with higher GPAs and scores (A2: 3.8/89, A4: 3.7/85, A8: 3.6/82) are rejected, while majority applicants with lower qualifications (A3: 3.0/65, A7: 2.8/60) are admitted. This pattern suggests the admission decisions are influenced by group membership rather than merit alone.",
          trustDelta: 15,
          category: "Fairness"
        }
      ]
    }
  ],

  // ============================================================
  // QUIZ BLITZ - Rapid-fire questions
  // ============================================================
  quizQuestions: [
    // Explainability - Conceptual
    {
      category: "Explainability",
      question: "What is the main challenge in creating explanations for AI systems?",
      choices: [
        "Explanations should focus only on technical details.",
        "Explanations must always be simplified into visual diagrams.",
        "Explanations should be both intuitive for humans and accurate about system operations.",
        "Explanations should avoid addressing risks such as bias."
      ],
      correct: 2,
      explanation: "Explaining AI requires balancing two goals: being intuitive enough for humans to understand while being accurate enough to reflect the system's true operations."
    },
    {
      category: "Explainability",
      question: "What is the main limitation of post-hoc explanations in deep neural networks?",
      choices: [
        "They may offer intuitive justifications that don't reflect the model's actual decision-making.",
        "They always provide transparent symbolic reasoning matching human cognition.",
        "They approximate predictions with confidence scores but fail to show differences between instances.",
        "They clearly highlight discriminative features but ignore generalization issues."
      ],
      correct: 0,
      explanation: "Post-hoc explanations can give plausible-sounding justifications that may not correspond to the model's real internal logic, especially when bias is present."
    },
    {
      category: "Explainability",
      question: "Which three types of post-hoc explanation methods are commonly used for complex AI models?",
      choices: [
        "Symbolic reasoning, reinforcement learning policies, and human memory recall.",
        "Visualization of training losses, parameter tuning, and data augmentation.",
        "Global explanations (e.g., feature importance), local explanations (e.g., LIME), and counterfactuals.",
        "Interactive dashboards, user surveys, and crowdsourced annotations."
      ],
      correct: 2,
      explanation: "The three key approaches are: global explanations (how the model behaves overall), local explanations (individual predictions), and counterfactuals (what-if scenarios)."
    },
    {
      category: "Explainability",
      question: "Which three approaches are crucial for making black-box AI models more interpretable?",
      choices: [
        "Automated hyperparameter tuning, loss visualization, and dropout.",
        "Symbolic logic reasoning, handcrafted rules, and expert systems.",
        "Surrogate models that mimic black boxes, local explanations like LIME, and counterfactual what-if scenarios.",
        "User surveys, dashboards, and crowdsourced annotations."
      ],
      correct: 2,
      explanation: "Surrogate models approximate black-box behavior with simpler models, LIME explains individual predictions locally, and counterfactuals show what changes would alter the outcome."
    },

    // Explainability - SHAP
    {
      category: "SHAP Values",
      question: "A SHAP output shows cp_0 has a large positive value and thal_3 has a negative value for a patient. What's the best interpretation?",
      choices: [
        "cp_0 is one of the main reasons the model leans toward higher risk for THIS patient, even though other features push down.",
        "cp_0 is more important than thal_3 in general, dominating the model's reasoning overall.",
        "The model would predict low risk if thal_3 were absent.",
        "cp_0 would have the same effect for most patients with similar demographics."
      ],
      correct: 0,
      explanation: "SHAP values are local: they describe how features influenced the prediction for a specific patient. The explanation doesn't generalize to other patients or imply global dominance."
    },
    {
      category: "SHAP Values",
      question: "From a SHAP summary plot, which CANNOT be determined?",
      choices: [
        "Which features have the largest overall impact on the model.",
        "The general direction of a feature's effect (e.g., higher oldpeak = lower risk).",
        "Why a specific patient received a probability of 0.68.",
        "Whether the effect of age varies across patients."
      ],
      correct: 2,
      explanation: "The SHAP summary plot shows aggregated values across all patients. Explaining one patient's specific probability requires a local SHAP explanation for that individual."
    },

    // Explainability - Decision Trees
    {
      category: "Decision Trees",
      question: "Two patients diverge at the root split on thal_2 and follow different paths. What does this illustrate?",
      choices: [
        "The tree combines features additively like logistic regression.",
        "Both patients are evaluated using the same sequence of rules.",
        "The model uses different features to explain each patient's prediction.",
        "The patients always get the same prediction."
      ],
      correct: 2,
      explanation: "Decision trees route patients through different conditional paths. Different paths mean different features are relevant for each prediction\u2014the explanation is path-dependent."
    },

    // Explainability - Random Forest
    {
      category: "Feature Importance",
      question: "In a Random Forest, oldpeak has the highest feature importance. What's the best interpretation?",
      choices: [
        "Increasing oldpeak increases predicted heart disease risk.",
        "oldpeak is frequently used across the forest to make informative splits that reduce impurity.",
        "oldpeak causes heart disease.",
        "oldpeak alone perfectly predicts the outcome."
      ],
      correct: 1,
      explanation: "Random Forest feature importance (mean decrease in impurity) shows how useful features are for splitting. It doesn't show direction, causality, or sufficiency."
    },
    {
      category: "Feature Importance",
      question: "From the Random Forest importance table, which conclusion CANNOT be justified?",
      choices: [
        "oldpeak is frequently used by the forest to split data.",
        "Increasing oldpeak will increase predicted risk of heart disease.",
        "thal_3 plays a larger role than chol overall.",
        "The forest relies on nonlinear decision rules."
      ],
      correct: 1,
      explanation: "Feature importance doesn't provide directional information. It tells you a feature is useful for splitting, but not WHETHER increasing it raises or lowers the prediction."
    },

    // Explainability - Grad-CAM
    {
      category: "Grad-CAM",
      question: "Comparing Grad-CAM for 'islet' and 'harbor', highlighted regions differ. What's the best interpretation?",
      choices: [
        "The model emphasizes isolated land for islet and coastal infrastructure for harbor.",
        "The model highlights the same regions for both, unable to distinguish them.",
        "The model attends to the center regardless of class.",
        "Grad-CAM highlights arbitrary unrelated regions."
      ],
      correct: 0,
      explanation: "Grad-CAM shows that the model uses different visual cues for each category: compact land surrounded by water for islet, coastal structures for harbor."
    },

    // Explainability - Global vs Local
    {
      category: "Global vs Local",
      question: "Across SHAP, LIME, and Grad-CAM examples, which conclusion is supported?",
      choices: [
        "Local explanations are simply subsets of global explanations.",
        "If a feature ranks highly globally, it must appear in every local explanation.",
        "A feature can be globally important yet irrelevant for a specific instance.",
        "Global and local explanations always agree on feature rankings."
      ],
      correct: 2,
      explanation: "Global importance does not guarantee local relevance. A globally important feature may not be used at all for a specific prediction, because they answer different questions."
    },
    {
      category: "Global vs Local",
      question: "Thomas uses Grad-CAM (strong attention on shoreline) and Stella uses LIME (a few features dominate). They disagree. What's true?",
      choices: [
        "If two explanation methods disagree, at least one must be wrong.",
        "Different explanation methods can emphasize different aspects of the same prediction.",
        "The model is unstable and cannot be trusted.",
        "Only one explanation method should ever be used."
      ],
      correct: 1,
      explanation: "Grad-CAM and LIME answer different questions even for the same model and input. Disagreement reflects the complexity of the model and the different focus of each method."
    },
    {
      category: "Trust & Explainability",
      question: "Stella says 'The explanations look reasonable, so we can trust the model.' Thomas disagrees. Who's right?",
      choices: [
        "Stella\u2014clear explanations mean the model is correct.",
        "Thomas\u2014explanations help diagnose behavior but don't verify prediction accuracy.",
        "Neither\u2014explanations are irrelevant to trust.",
        "Both\u2014it depends on the domain."
      ],
      correct: 1,
      explanation: "Interpretability reveals HOW a model makes decisions, not WHETHER those decisions are correct. Trust requires combining performance evaluation WITH interpretability."
    },

    // Fairness
    {
      category: "Fairness",
      question: "A lending dataset shows 65% approval for Group A and 50% for Group B, with \u03B1 = 0.20. Is it \u03B1-biased?",
      choices: [
        "No, because 0.15 < 0.20.",
        "Yes, because any difference indicates bias.",
        "Yes, because lending is high-stakes.",
        "Yes, because removing protected attributes can't fix correlation."
      ],
      correct: 0,
      explanation: "\u03B1-bias is threshold-based: difference must be \u2265 \u03B1. Here: 0.65 \u2212 0.50 = 0.15 < 0.20. The dataset does NOT meet the criterion for \u03B1-bias at this threshold."
    },
    {
      category: "Fairness",
      question: "In COMPAS, imposing \u03B5-demographic parity means:",
      choices: [
        "Both false positive and false negative rates must match exactly across groups.",
        "Group membership is dropped from the model.",
        "The proportion of 'high risk' predictions is constrained to be similar across groups.",
        "The dataset is balanced by resampling minority defendants."
      ],
      correct: 2,
      explanation: "\u03B5-demographic parity constrains the positive decision rates across groups to differ by at most \u03B5. It doesn't require equal error rates, feature removal, or resampling."
    },
    {
      category: "Optimization",
      question: "What is jointly optimized to achieve \u03B5-demographic parity?",
      choices: [
        "Only the logistic regression coefficients \u03B2.",
        "Only the outcome labels, by flipping a fixed percentage per group.",
        "Both \u03B2 coefficients and which outcome labels to flip via binary optimization.",
        "Neither; parity is achieved by removing protected attributes."
      ],
      correct: 2,
      explanation: "The method jointly optimizes logistic regression parameters (\u03B2) AND which labels to flip (Z_i) in a single mixed-integer optimization to meet \u03B5-parity constraints."
    },
    {
      category: "Optimization",
      question: "The transformation Y'_i = Y_i(1 \u2212 2Z_i) allows what during optimization?",
      choices: [
        "It smooths labels to reduce variance.",
        "It changes feature values for an observation.",
        "It allows outcome labels to be conditionally flipped during optimization.",
        "It enforces demographic parity automatically without constraints."
      ],
      correct: 2,
      explanation: "When Z_i = 1, the label flips sign. When Z_i = 0, it stays the same. This enables the optimization to choose which labels to flip for fairness."
    },
    {
      category: "Feedback Loops",
      question: "A city uses arrest data for police patrol models. Over time, one neighborhood gets policed more. What is this?",
      choices: [
        "Equal policing with the same model.",
        "Fairness through blindness.",
        "A feedback loop amplifying initial disparities.",
        "Overfitting to historical data."
      ],
      correct: 2,
      explanation: "A classic feedback loop: more policing \u2192 more observed arrests \u2192 model thinks area is riskier \u2192 even more policing. The data is shaped by past decisions."
    },
    {
      category: "Fairness Trade-offs",
      question: "Why is \u03B5-demographic parity described as a 'tunable' trade-off?",
      choices: [
        "\u03B5 sets tolerance on individual risk score adjustments.",
        "\u03B5 determines how protected attributes influence predictions.",
        "Smaller \u03B5 enforces stricter parity at potentially higher cost to meritocracy.",
        "\u03B5 directly controls overall classification accuracy."
      ],
      correct: 2,
      explanation: "\u03B5 is a policy lever: smaller values = stricter parity but more label flips. The 'price of diversity' is quantifiable\u2014\u03B5 lets you explicitly balance fairness and performance."
    },
    // INTERACTIVE: Slider question
    {
      type: "slider",
      category: "\u03B1-Bias Threshold",
      question: "Group A has a 72% admission rate. Group B has 55%. Set the slider to the minimum \u03B1 threshold that would classify this dataset as \u03B1-biased.",
      displayFormula: "|\u0394Rate| = |0.72 \u2212 0.55| = 0.17. Set \u03B1 \u2264 0.17 for \u03B1-biased.",
      min: 0,
      max: 0.5,
      step: 0.01,
      correctRange: [0.16, 0.17],
      explanation: "The rate difference is 0.17. Any \u03B1 \u2264 0.17 means the difference meets or exceeds the threshold, classifying the dataset as \u03B1-biased. The minimum threshold is exactly 0.17."
    },
    // INTERACTIVE: Slider question 2
    {
      type: "slider",
      category: "\u03B5-Demographic Parity",
      question: "A model labels 40% of Group A and 28% of Group B as 'high risk'. What is the smallest \u03B5 that this model satisfies for demographic parity?",
      displayFormula: "|\u0394Rate| = |0.40 \u2212 0.28| = 0.12. \u03B5 must be \u2265 0.12.",
      min: 0,
      max: 0.5,
      step: 0.01,
      correctRange: [0.11, 0.13],
      explanation: "The difference in positive prediction rates is 0.12. The model satisfies \u03B5-demographic parity when \u03B5 \u2265 0.12. So the smallest valid \u03B5 is 0.12."
    },
    // INTERACTIVE: Order question
    {
      type: "order",
      category: "Interpretability",
      question: "Rank these models from MOST interpretable to LEAST interpretable:",
      items: ["Decision Tree (depth 3)", "Logistic Regression", "Random Forest (500 trees)", "Deep Neural Network"],
      correctOrder: ["Decision Tree (depth 3)", "Logistic Regression", "Random Forest (500 trees)", "Deep Neural Network"],
      explanation: "Shallow decision trees are most interpretable (explicit rules). Logistic regression has interpretable coefficients. Random forests aggregate many trees, reducing interpretability. Deep neural networks are the least interpretable (black box)."
    },
    // INTERACTIVE: Order question 2
    {
      type: "order",
      category: "Explanation Methods",
      question: "Order these steps for generating a LIME explanation:",
      items: ["Perturb the input around the instance", "Fit a simple interpretable model locally", "Get predictions from the black-box model for perturbed inputs", "Present the interpretable model as the explanation"],
      correctOrder: ["Perturb the input around the instance", "Get predictions from the black-box model for perturbed inputs", "Fit a simple interpretable model locally", "Present the interpretable model as the explanation"],
      explanation: "LIME works by: (1) perturbing the input, (2) querying the black-box model on perturbations, (3) fitting a simple model to those predictions weighted by proximity, and (4) presenting that local model as the explanation."
    },
    // INTERACTIVE: Rapid-tap question
    {
      type: "rapid-tap",
      category: "Local Explanations",
      question: "Quick! Tap all the methods that provide LOCAL (instance-level) explanations:",
      timeLimit: 8,
      items: [
        { text: "SHAP values", isCorrect: true },
        { text: "LIME", isCorrect: true },
        { text: "Grad-CAM", isCorrect: true },
        { text: "Feature importance", isCorrect: false },
        { text: "Counterfactuals", isCorrect: true },
        { text: "Permutation importance", isCorrect: false },
        { text: "Decision path", isCorrect: true },
        { text: "Training loss curve", isCorrect: false }
      ],
      explanation: "SHAP, LIME, Grad-CAM, counterfactuals, and decision paths all explain individual predictions. Feature importance and permutation importance are global methods. Training loss curves describe model training, not predictions."
    },
    // INTERACTIVE: Rapid-tap question 2
    {
      type: "rapid-tap",
      category: "Fairness Concepts",
      question: "Tap all the concepts that are fairness-related (not explainability):",
      timeLimit: 8,
      items: [
        { text: "\u03B1-Bias", isCorrect: true },
        { text: "SHAP values", isCorrect: false },
        { text: "Feedback loops", isCorrect: true },
        { text: "Grad-CAM", isCorrect: false },
        { text: "\u03B5-Demographic parity", isCorrect: true },
        { text: "Label flipping", isCorrect: true },
        { text: "LIME", isCorrect: false },
        { text: "Price of diversity", isCorrect: true }
      ],
      explanation: "\u03B1-Bias, feedback loops, \u03B5-demographic parity, label flipping, and price of diversity are all fairness concepts. SHAP, Grad-CAM, and LIME are explainability methods."
    }
  ],

  // ============================================================
  // SCENARIO LAB - Interactive scenarios
  // ============================================================
  scenarios: [
    {
      title: "Decision Tree Path Tracing",
      description: "A patient has: thal_2 \u2264 0.5, oldpeak = 0.21, cp_0 = 0.6. Trace through the decision tree.",
      visual: `<div class="scenario-visual">
        <div><span class="tree-node">[Root] thal_2 \u2264 0.5?</span></div>
        <div>&nbsp;&nbsp;\u251C\u2500 YES \u2192 <span class="tree-node">[Node] oldpeak \u2264 0.25?</span></div>
        <div>&nbsp;&nbsp;\u2502&nbsp;&nbsp;\u251C\u2500 YES \u2192 <span class="tree-node">[Node] cp_0 \u2264 0.5?</span></div>
        <div>&nbsp;&nbsp;\u2502&nbsp;&nbsp;\u2502&nbsp;&nbsp;\u251C\u2500 YES \u2192 <span class="tree-leaf-healthy">\u25CF No Disease</span></div>
        <div>&nbsp;&nbsp;\u2502&nbsp;&nbsp;\u2502&nbsp;&nbsp;\u2514\u2500 NO  \u2192 <span class="tree-leaf-healthy">\u25CF No Disease</span></div>
        <div>&nbsp;&nbsp;\u2502&nbsp;&nbsp;\u2514\u2500 NO  \u2192 <span class="tree-leaf-disease">\u25CF Disease</span></div>
        <div>&nbsp;&nbsp;\u2514\u2500 NO  \u2192 <span class="tree-node">[Node] age \u2264 0.019?</span></div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\u251C\u2500 YES \u2192 <span class="tree-leaf-disease">\u25CF Disease</span></div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\u2514\u2500 NO  \u2192 <span class="tree-leaf-healthy">\u25CF No Disease</span></div>
      </div>`,
      questions: [
        {
          question: "This patient follows which branch at the root?",
          choices: ["Left (YES) branch", "Right (NO) branch"],
          correct: 0,
          explanation: "thal_2 = value \u2264 0.5, so YES \u2192 left branch."
        },
        {
          question: "What does the model predict for this patient?",
          choices: ["Disease", "No Disease"],
          correct: 1,
          explanation: "Path: thal_2 \u2264 0.5 (YES) \u2192 oldpeak \u2264 0.25 (YES, 0.21 \u2264 0.25) \u2192 cp_0 \u2264 0.5 (NO, 0.6 > 0.5) \u2192 No Disease."
        },
        {
          question: "Does the feature 'age' affect this patient's prediction?",
          choices: ["Yes, age always matters", "No, age is not on this patient's path"],
          correct: 1,
          explanation: "Features not encountered along the path (like age, which is on the right branch) do not affect the prediction. This is a key interpretability property of decision trees."
        }
      ]
    },
    {
      title: "SHAP Value Interpretation",
      description: "Examine this patient's local SHAP values from the XGBoost model.",
      visual: `<div class="scenario-visual">
        <p style="color: var(--accent-cyan); margin-bottom: 12px;"><strong>Patient #47 \u2014 Local SHAP Values</strong></p>
        <p style="margin-bottom: 12px;">Predicted probability: <strong style="color: var(--accent-orange);">0.72</strong> (Disease)</p>
        <div class="feature-bar">
          <span style="width:80px; color: var(--text-secondary);">cp_0</span>
          <div class="bar bar-positive" style="width:140px;"></div>
          <span class="shap-positive">+0.18</span>
        </div>
        <div class="feature-bar">
          <span style="width:80px; color: var(--text-secondary);">ca_0</span>
          <div class="bar bar-positive" style="width:110px;"></div>
          <span class="shap-positive">+0.14</span>
        </div>
        <div class="feature-bar">
          <span style="width:80px; color: var(--text-secondary);">chol</span>
          <div class="bar bar-positive" style="width:60px;"></div>
          <span class="shap-positive">+0.08</span>
        </div>
        <div class="feature-bar">
          <span style="width:80px; color: var(--text-secondary);">thalach</span>
          <div class="bar bar-positive" style="width:40px;"></div>
          <span class="shap-positive">+0.05</span>
        </div>
        <div class="feature-bar">
          <span style="width:80px; color: var(--text-secondary);">age</span>
          <div class="bar bar-negative" style="width:50px;"></div>
          <span class="shap-negative">-0.06</span>
        </div>
        <div class="feature-bar">
          <span style="width:80px; color: var(--text-secondary);">oldpeak</span>
          <div class="bar bar-negative" style="width:50px;"></div>
          <span class="shap-negative">-0.06</span>
        </div>
        <div class="feature-bar">
          <span style="width:80px; color: var(--text-secondary);">thal_3</span>
          <div class="bar bar-negative" style="width:50px;"></div>
          <span class="shap-negative">-0.06</span>
        </div>
      </div>`,
      questions: [
        {
          question: "Which explanation best reflects the model's reasoning for this patient?",
          choices: [
            "The model predicts disease because cp_0 is the most influential feature overall.",
            "The model predicts disease because several patient-specific factors increased risk more than other factors decreased it.",
            "The model predicts disease because the probability exceeds a clinical threshold.",
            "The model predicts disease because these features place the patient in a high-risk subgroup."
          ],
          correct: 1,
          explanation: "A good explanation describes how the model combined THIS patient's features. Several factors (cp_0, ca_0, chol, thalach) increased risk, while others (thal_3, oldpeak, age) decreased it. The net balance pushed toward disease."
        },
        {
          question: "Can you conclude from these values that cp_0 is the most important feature in the model overall?",
          choices: [
            "Yes, it has the largest SHAP value.",
            "No, these are local values for one patient only."
          ],
          correct: 1,
          explanation: "Local SHAP values describe this specific patient. A feature can have a large local impact for one patient but small impact globally. Global importance requires aggregating across many patients."
        }
      ]
    },
    {
      title: "\u03B1-Bias Calculator",
      description: "Determine whether datasets meet the \u03B1-bias threshold.",
      visual: `<div class="scenario-visual">
        <p style="color: var(--accent-cyan); margin-bottom: 12px;"><strong>\u03B1-Bias Definition</strong></p>
        <p>A dataset is \u03B1-biased if:</p>
        <p style="text-align:center; font-size: 1.1em; margin: 12px 0; color: var(--accent-orange);">
          |Rate_A \u2212 Rate_B| \u2265 \u03B1
        </p>
        <br>
        <p><strong>Dataset 1:</strong> Loan approvals: Group A = 65%, Group B = 50%, \u03B1 = 0.20</p>
        <p><strong>Dataset 2:</strong> Job offers: Group A = 48%, Group B = 46%, \u03B1 = 0.05</p>
        <p><strong>Dataset 3:</strong> Parole granted: Group X = 35%, Group Y = 20%, \u03B1 = 0.12</p>
      </div>`,
      questions: [
        {
          question: "Dataset 1: Is it \u03B1-biased? (65% vs 50%, \u03B1 = 0.20)",
          choices: ["Yes, \u03B1-biased", "No, not \u03B1-biased"],
          correct: 1,
          explanation: "|0.65 \u2212 0.50| = 0.15. Since 0.15 < 0.20, this dataset is NOT \u03B1-biased."
        },
        {
          question: "Dataset 2: Is it \u03B1-biased? (48% vs 46%, \u03B1 = 0.05)",
          choices: ["Yes, \u03B1-biased", "No, not \u03B1-biased"],
          correct: 1,
          explanation: "|0.48 \u2212 0.46| = 0.02. Since 0.02 < 0.05, this dataset is NOT \u03B1-biased."
        },
        {
          question: "Dataset 3: Is it \u03B1-biased? (35% vs 20%, \u03B1 = 0.12)",
          choices: ["Yes, \u03B1-biased", "No, not \u03B1-biased"],
          correct: 0,
          explanation: "|0.35 \u2212 0.20| = 0.15. Since 0.15 \u2265 0.12, this dataset IS \u03B1-biased."
        }
      ]
    },
    {
      title: "Matching: Explanation Methods",
      type: "matching",
      description: "Match each explanation method to its correct description.",
      pairs: [
        { left: "Global Explanation", right: "How the model behaves overall (e.g., feature importance)" },
        { left: "Local Explanation", right: "Why this specific prediction was made (e.g., LIME)" },
        { left: "Counterfactual", right: "What minimal change would alter the outcome" },
        { left: "Surrogate Model", right: "A simpler model that approximates a black box" },
        { left: "SHAP Values", right: "Attribute prediction contributions to individual features" },
        { left: "Grad-CAM", right: "Highlights image regions supporting a class prediction" }
      ]
    },
    {
      title: "Fairness Balance",
      type: "scale",
      description: "Use the sliders to explore how different group rates affect \u03B1-bias. Then answer the challenge question.",
      alpha: 0.10,
      challenge: "A company's hiring rates are: Group A = 62%, Group B = 48%. With \u03B1 = 0.10, what is the status?",
      choices: [
        "Not \u03B1-biased, because both groups are above 40%.",
        "\u03B1-biased, because |0.62 \u2212 0.48| = 0.14 \u2265 0.10.",
        "Not \u03B1-biased, because the rates are within 20% of each other.",
        "Cannot determine without knowing protected attributes."
      ],
      correct: 1,
      explanation: "The difference is |0.62 \u2212 0.48| = 0.14. Since 0.14 \u2265 0.10 = \u03B1, the dataset IS \u03B1-biased. The definition only depends on the outcome rate gap, not the absolute levels."
    },
    {
      title: "Matching: Fairness Concepts",
      type: "matching",
      description: "Match each fairness concept to its definition.",
      pairs: [
        { left: "\u03B1-Bias", right: "Outcome-rate gap between groups meets or exceeds threshold \u03B1" },
        { left: "\u03B5-Demographic Parity", right: "Positive prediction rates across groups differ by at most \u03B5" },
        { left: "Feedback Loop", right: "Model decisions shape future data, amplifying disparities" },
        { left: "Price of Diversity", right: "Measurable cost of enforcing fairness constraints on meritocracy" },
        { left: "Label Flipping (Z_i)", right: "Binary optimization variable deciding which outcomes to change" },
        { left: "Proxy Leakage", right: "Bias persists through correlated features even after removing protected attributes" }
      ]
    }
  ],

  // ============================================================
  // BOSS BATTLE - Multi-part challenges
  // ============================================================
  bosses: [
    {
      name: "The Bias Dragon",
      hp: 100,
      weakness: "fairness",
      attacks: [
        {
          name: "Feedback Flame",
          tag: "fairness",
          description: "The Bias Dragon breathes fire fueled by feedback loops! Answer to douse the flames.",
          question: "A city's arrest model generates more arrests in heavily-policed areas, which feeds back into the model. What breaks this cycle?",
          choices: [
            "Retrain the model with more data from those areas.",
            "Remove neighborhood features from the model.",
            "Freeze patrol allocation to break the link between prediction and data collection.",
            "Add more features to improve model accuracy."
          ],
          correct: 2,
          damage: 25,
          explanation: "Breaking the feedback loop requires severing the connection between model predictions and data generation. Freezing allocation stops the cycle."
        },
        {
          name: "Disparity Strike",
          tag: "fairness",
          description: "The dragon attacks with numerical puzzles about bias thresholds!",
          question: "College admissions: Group A admitted 72%, Group B admitted 55%, \u03B1 = 0.15. Is the dataset \u03B1-biased?",
          choices: [
            "No, the difference is only 0.17 which is close to \u03B1.",
            "Yes, because |0.72 \u2212 0.55| = 0.17 \u2265 0.15.",
            "No, because college admissions can't be biased.",
            "Yes, but only if we also check false positive rates."
          ],
          correct: 1,
          damage: 25,
          explanation: "The difference 0.72 \u2212 0.55 = 0.17. Since 0.17 \u2265 0.15 = \u03B1, the dataset IS \u03B1-biased."
        },
        {
          name: "Parity Puzzle",
          tag: "optimization",
          description: "The dragon challenges you to understand fairness optimization!",
          question: "In fairness-aware optimization, what is jointly optimized to achieve \u03B5-demographic parity?",
          choices: [
            "Only the model's coefficients.",
            "Only the labels, flipping a fixed percentage.",
            "Both the model coefficients and which labels to flip, via binary optimization.",
            "Nothing\u2014parity is achieved by removing protected attributes."
          ],
          correct: 2,
          damage: 25,
          explanation: "The method jointly optimizes logistic regression parameters AND label flip decisions (Z_i) in a single mixed-integer optimization."
        },
        {
          name: "Final Breath",
          tag: "fairness",
          description: "The Bias Dragon unleashes its ultimate attack! Only true understanding can defeat it.",
          question: "A classification tree trained to audit label flips splits on 'race = minority' and 'prior convictions > 2'. A policymaker says this proves the model is racist. Is this interpretation correct?",
          choices: [
            "Yes, any split on race proves discrimination.",
            "No\u2014the tree shows WHERE fairness interventions were applied, not that the model itself is biased.",
            "Yes, because optimization should never involve protected attributes.",
            "No, because classification trees are always random."
          ],
          correct: 1,
          damage: 25,
          explanation: "The audit tree reveals patterns in where fairness corrections were applied. It's an interpretability tool explaining the optimization's flipping decisions, not evidence of model bias."
        }
      ]
    },
    {
      name: "The Black Box Sphinx",
      hp: 100,
      weakness: "explainability",
      attacks: [
        {
          name: "Opacity Riddle",
          tag: "explainability",
          description: "The Sphinx poses a riddle about model transparency!",
          question: "A model uses deep learning for medical diagnosis. Which approach provides inherent interpretability?",
          choices: [
            "Training a deeper network for better accuracy.",
            "Using a decision tree that provides built-in rule-based explanations.",
            "Adding more hidden layers for richer representations.",
            "Post-processing predictions with random sampling."
          ],
          correct: 1,
          damage: 25,
          explanation: "Decision trees provide inherent interpretability through explicit rule-based paths. Deep networks require post-hoc explanation methods."
        },
        {
          name: "LIME Labyrinth",
          tag: "explainability",
          description: "Navigate the maze of local explanations!",
          question: "LIME explains predictions by:",
          choices: [
            "Retraining the entire model on a subset of data.",
            "Perturbing the input and fitting a simple local model that approximates the classifier's behavior near that point.",
            "Visualizing all hidden layer activations.",
            "Computing global feature importance across the entire dataset."
          ],
          correct: 1,
          damage: 25,
          explanation: "LIME perturbs the input, observes how predictions change, and fits a simple interpretable model that approximates the classifier locally."
        },
        {
          name: "Causation Confusion",
          tag: "explainability",
          description: "The Sphinx challenges you on the limits of explanations!",
          question: "Grad-CAM highlights regions important for a model's prediction. These highlighted regions represent:",
          choices: [
            "The true physical causes of the scene in the real world.",
            "Random noise from the convolutional layers.",
            "Learned associations in the network, not causal explanations.",
            "Pixel-level reconstruction of the input image."
          ],
          correct: 2,
          damage: 25,
          explanation: "Grad-CAM reveals learned associations\u2014regions the model found useful for its prediction\u2014not causal explanations of real-world phenomena."
        },
        {
          name: "Trust Trap",
          tag: "trust",
          description: "The Sphinx's final challenge: should you trust explanations?",
          question: "'The explanations look reasonable, so we can trust the model.' Is this correct?",
          choices: [
            "Yes\u2014reasonable explanations mean correct predictions.",
            "No\u2014explanations diagnose model behavior but don't verify prediction accuracy. Trust needs both.",
            "Yes\u2014interpretability is the only thing that matters.",
            "No\u2014explanations are never useful for building trust."
          ],
          correct: 1,
          damage: 25,
          explanation: "Trust requires BOTH performance evaluation AND interpretability. Explanations reveal HOW a model decides, not WHETHER those decisions are correct."
        }
      ]
    }
  ],

  // ============================================================
  // BADGES
  // ============================================================
  badges: {
    perfectChapter: { icon: "\u2B50", name: "Perfect Chapter" },
    speedDemon: { icon: "\u26A1", name: "Speed Demon" },
    comboMaster: { icon: "\u{1F525}", name: "Combo Master" },
    fairnessChampion: { icon: "\u2696\uFE0F", name: "Fairness Champion" },
    explainabilityExpert: { icon: "\u{1F52C}", name: "Explainability Expert" },
    dragonSlayer: { icon: "\u{1F409}", name: "Dragon Slayer" },
    sphinxSolver: { icon: "\u{1F9E0}", name: "Sphinx Solver" },
    fullMarks: { icon: "\u{1F3C6}", name: "Full Marks" },
    noMistakes: { icon: "\u{1F4AF}", name: "Flawless" }
  }
};
