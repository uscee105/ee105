---
layout: page
title: Staff
description: A listing of all the course staff members.
---

{% comment %}
  ===========================================================================
  WHO APPEARS ON THIS PAGE

  Only the people named below are displayed, IN THE ORDER LISTED. Every other
  file in _staffers/ stays in the repo untouched -- it is simply not shown.

  To SHOW someone : add their `name:` value to the list below.
  To HIDE someone : remove their name from the list. Do NOT delete their file.
  To REORDER      : move a name within the list.

  Names must match the `name:` field in the staffer file exactly.

  Files currently in _staffers/:
      _staffers/rehan.md     ->  Rehan Kapadia        (Instructor)         shown
      _staffers/erez.md      ->  Erez Zolkov          (Instructor)         shown
      _staffers/atiyeh.md    ->  Atiyeh Abbasi Jalal  (Teaching Assistant) shown
      _staffers/miles.md     ->  Miles Gorman         (Teaching Assistant) shown
      _staffers/shadman.md   ->  Shadman Shahid       (Teaching Assistant) shown
      _staffers/walter.md    ->  Walter Unglaub       (Teaching Assistant) shown
      _staffers/yasser.md    ->  Yasser Khan          (Instructor)         hidden
      _staffers/shashank.md  ->  Shashank Hegde       (Teaching Assistant) hidden
  ===========================================================================
{% endcomment %}

{% assign shown_staff = "Rehan Kapadia,Erez Zolkov,Atiyeh Abbasi Jalal,Shadman Shahid,Miles Gorman,Walter Unglaub" | split: "," %}

{% assign visible_staffers = site.staffers | where_exp: "s", "shown_staff contains s.name" %}
{% assign instructors = visible_staffers | where: 'role', 'Instructor' %}
{% assign teaching_assistants = visible_staffers | where: 'role', 'Teaching Assistant' %}


{% if instructors.size != 0 %}
{% if instructors.size == 1 %}
## Instructor
{% else %}
## Instructors
{% endif %}

{% for staff_name in shown_staff %}
{% assign staffer = instructors | where: 'name', staff_name | first %}
{% if staffer %}
{{ staffer }}
{% endif %}
{% endfor %}
{% endif %}

{% if teaching_assistants.size != 0 %}
{% if teaching_assistants.size == 1 %}
## Teaching Assistant
{% else %}
## Teaching Assistants
{% endif %}

{% for staff_name in shown_staff %}
{% assign staffer = teaching_assistants | where: 'name', staff_name | first %}
{% if staffer %}
{{ staffer }}
{% endif %}
{% endfor %}
{% endif %}
