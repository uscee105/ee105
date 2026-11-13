---
layout: page
title: Grades up to Quiz 6
nav_order: 4
description: Class score statistics for EE 105 Fall 2026, up to Quiz 6.
permalink: /grades/
---

# Grades up to Quiz 6

Across **<span id="gr-students">—</span>** students with at least one score, the class average so far is
**<span id="gr-mean">—</span>%** and the median is **<span id="gr-median">—</span>%**.
<span id="gr-hardest">—</span> was the hardest paper (mean <span id="gr-hardest-mean">—</span>%) and
<span id="gr-easiest">—</span> the easiest (mean <span id="gr-easiest-mean">—</span>%).
{: .fs-5 .fw-300 }

This page shows the class as a whole. Your own scores are on [Gradescope](https://www.gradescope.com/courses/1378428).
{: .fs-3 }

## Overall so far

Each student's overall score is the plain average of their seven percentage scores (six quizzes and the
midterm, weighted equally), with a missed paper counted as 0. The roster has <span id="gr-roster">—</span>
students; <span id="gr-noscores">—</span> have no scores at all and are left out.
{: .fs-3 }

<div class="gr-card">
<div class="gr-tiles" id="gr-tiles"></div>
<div class="gr-chart" id="gr-overall"><noscript>The charts need JavaScript.</noscript></div>
<div class="gr-legend"><span>Curve: smoothed share of students at each overall score</span><span><i class="gr-key"></i>Mean</span><span><i class="gr-key gr-key-dash"></i>Median</span></div>
</div>

## Each quiz and the midterm

Both sections and all midterm versions are pooled. Scores are percentages of each paper's own maximum;
the statistics cover the students who took that paper. Bars count students in each 10-point band.
Solid line: mean. Dashed line: median.
{: .fs-3 }

<div class="gr-grid" id="gr-grid"></div>

## Side by side

All values are percentages except Taken, the number of students with a score.
{: .fs-3 }

<div class="gr-scroll">
<table>
<thead><tr><th>Assessment</th><th>Taken</th><th>Mean</th><th>Median</th><th>Std dev</th><th>Min</th><th>Max</th></tr></thead>
<tbody id="gr-rows"></tbody>
</table>
</div>

<link rel="stylesheet" href="{{ site.baseurl }}/assets/grades/grades.css">
<script src="{{ site.baseurl }}/assets/grades/grades-data.js"></script>
<script src="{{ site.baseurl }}/assets/grades/grades.js"></script>
