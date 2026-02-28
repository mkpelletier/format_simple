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
 * Renderer for format_simple.
 *
 * @package    format_simple
 * @copyright  2025 South African Theological Seminary <ict@sats.ac.za>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace format_simple\output;

use core_courseformat\output\section_renderer;

/**
 * Renderer for the simple course format.
 *
 * Extends the core section renderer. The actual rendering is delegated to
 * output classes and Mustache templates.
 */
class renderer extends section_renderer {
    // All rendering is handled by output classes and templates.
    // This class is required by the Moodle course format plugin system.
}
