package com.biblequiz.trivia

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

data class Question(val text: String, val options: List<String>, val correctIndex: Int)

class MainActivity : AppCompatActivity() {

    private val questions = listOf(
        Question("Who built the ark?", listOf("Moses", "Noah", "Abraham", "David"), 1),
        Question("How many days and nights did it rain during the flood?", listOf("7", "40", "100", "12"), 1),
        Question("Who led the Israelites out of Egypt?", listOf("Joshua", "Aaron", "Moses", "Samuel"), 2),
        Question("What did God create on the first day?", listOf("Animals", "Light", "Man", "Plants"), 1),
        Question("Who was thrown into the lions' den?", listOf("Daniel", "Jonah", "David", "Elijah"), 0),
        Question("What did Jesus turn water into at the wedding in Cana?", listOf("Oil", "Wine", "Milk", "Honey"), 1),
        Question("How many disciples did Jesus choose?", listOf("10", "12", "7", "14"), 1),
        Question("Who betrayed Jesus for thirty pieces of silver?", listOf("Peter", "Thomas", "Judas", "John"), 2),
        Question("What did David use to defeat Goliath?", listOf("Sword", "Spear", "Sling", "Bow"), 2),
        Question("\"In the beginning God created the heavens and the ___.\"", listOf("Sea", "Earth", "Stars", "Sun"), 1),
        Question("Who was swallowed by a great fish?", listOf("Jonah", "Elijah", "Peter", "Paul"), 0),
        Question("How many plagues did God send upon Egypt?", listOf("7", "10", "12", "3"), 1),
        Question("Who was the first man created by God?", listOf("Abel", "Cain", "Adam", "Seth"), 2),
        Question("What did the Israelites cross to escape Egypt?", listOf("Jordan River", "Red Sea", "Dead Sea", "Sea of Galilee"), 1),
        Question("Who is known as the wisest king of Israel?", listOf("Saul", "David", "Solomon", "Rehoboam"), 2)
    ).shuffled()

    private var currentIndex = 0
    private var score = 0

    private lateinit var tvProgress: TextView
    private lateinit var tvScore: TextView
    private lateinit var tvQuestion: TextView
    private lateinit var tvFeedback: TextView
    private lateinit var tvResult: TextView
    private lateinit var optionButtons: List<Button>
    private lateinit var btnNext: Button
    private lateinit var btnRestart: Button
    private lateinit var resultLayout: LinearLayout
    private lateinit var quizViews: List<View>

    private val optionColor = Color.parseColor("#8D6E63")
    private val correctColor = Color.parseColor("#2E7D32")
    private val wrongColor = Color.parseColor("#C62828")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvProgress = findViewById(R.id.tvProgress)
        tvScore = findViewById(R.id.tvScore)
        tvQuestion = findViewById(R.id.tvQuestion)
        tvFeedback = findViewById(R.id.tvFeedback)
        tvResult = findViewById(R.id.tvResult)
        resultLayout = findViewById(R.id.resultLayout)
        btnNext = findViewById(R.id.btnNext)
        btnRestart = findViewById(R.id.btnRestart)

        optionButtons = listOf(
            findViewById(R.id.btnOption1),
            findViewById(R.id.btnOption2),
            findViewById(R.id.btnOption3),
            findViewById(R.id.btnOption4)
        )

        quizViews = listOf(tvQuestion, tvFeedback, btnNext) + optionButtons

        optionButtons.forEachIndexed { index, button ->
            button.setOnClickListener { onOptionSelected(index) }
        }

        btnNext.setOnClickListener { showNextQuestion() }
        btnRestart.setOnClickListener { restartQuiz() }

        showQuestion()
    }

    private fun showQuestion() {
        val question = questions[currentIndex]
        tvProgress.text = "Question ${currentIndex + 1}/${questions.size}"
        tvScore.text = "Score: $score"
        tvQuestion.text = question.text
        tvFeedback.text = ""
        btnNext.visibility = View.GONE

        optionButtons.forEachIndexed { index, button ->
            button.text = question.options[index]
            button.isEnabled = true
            button.setBackgroundColor(optionColor)
            button.setTextColor(Color.WHITE)
        }
    }

    private fun onOptionSelected(selectedIndex: Int) {
        val question = questions[currentIndex]
        optionButtons.forEach { it.isEnabled = false }

        if (selectedIndex == question.correctIndex) {
            score++
            tvFeedback.text = "Correct!"
            tvFeedback.setTextColor(correctColor)
            optionButtons[selectedIndex].setBackgroundColor(correctColor)
        } else {
            tvFeedback.text = "Wrong! Correct answer: ${question.options[question.correctIndex]}"
            tvFeedback.setTextColor(wrongColor)
            optionButtons[selectedIndex].setBackgroundColor(wrongColor)
            optionButtons[question.correctIndex].setBackgroundColor(correctColor)
        }

        tvScore.text = "Score: $score"
        btnNext.visibility = View.VISIBLE
    }

    private fun showNextQuestion() {
        currentIndex++
        if (currentIndex < questions.size) {
            showQuestion()
        } else {
            showResult()
        }
    }

    private fun showResult() {
        quizViews.forEach { it.visibility = View.GONE }
        tvProgress.visibility = View.GONE
        resultLayout.visibility = View.VISIBLE

        val message = when {
            score == questions.size -> "Perfect! You scored $score out of ${questions.size}!"
            score >= questions.size * 0.7 -> "Well done! You scored $score out of ${questions.size}."
            score >= questions.size * 0.4 -> "Good effort! You scored $score out of ${questions.size}."
            else -> "You scored $score out of ${questions.size}. Keep studying!"
        }
        tvResult.text = message
    }

    private fun restartQuiz() {
        currentIndex = 0
        score = 0
        resultLayout.visibility = View.GONE
        tvProgress.visibility = View.VISIBLE
        quizViews.forEach { it.visibility = View.VISIBLE }
        btnNext.visibility = View.GONE
        showQuestion()
    }
}
