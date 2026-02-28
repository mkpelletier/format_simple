<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Course view page for format_simple.
 *
 * @package    format_simple
 * @copyright  2025 South African Theological Seminary <ict@sats.ac.za>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Moodle automatically adds the body class 'format-simple' based on the
// course format name, so we do not need to call $PAGE->add_body_class().

$format = course_get_format($course);
$course = $format->get_course();
$renderer = $format->get_renderer($PAGE);

// Output the course content using the reactive output class system.
$outputclass = $format->get_output_classname('content');
$widget = new $outputclass($format);
echo $renderer->render($widget);
