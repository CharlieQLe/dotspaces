/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const { Clutter, GObject, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const Dotspaces = GObject.registerClass(
class Dotspaces extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Dotspaces'));
        this.track_hover = false;

        // Create the box to hold the dots 
		this.dotsBox = new St.BoxLayout({});
        this.add_child(this.dotsBox);
        this._active_workspace_changed = global.workspace_manager.connect('active-workspace-changed', this._update_dots.bind(this));
        this._workspace_number_changed = global.workspace_manager.connect('notify::n-workspaces', this._update_dots.bind(this));

        // Connect input
        this._workspace_scroll = this.connect('scroll-event', this._onScroll.bind(this));
    }

    _destroy() {
        // Disconnect events
        if (this._ws_active_changed) global.workspace_manager.disconnect(this._ws_active_changed);
        if (this._workspace_number_changed) global.workspace_manager.disconnect(this._workspace_number_changed);
        if (this._workspace_scroll) this.disconnect(this._workspace_scroll);

        // Destroy
        this.dotsBox.destroy();
        super.destroy();
    }
    
    _update_dots() {
        // Destroy all dots
        this.dotsBox.destroy_all_children();
        
        // Update workspace information
        this.workspace_count = global.workspace_manager.get_n_workspaces();
        this.active_workspace_index = global.workspace_manager.get_active_workspace_index();

        // Draw all dots
        for (let i = 0; i < this.workspace_count; i++) {
            // Create the new workspace indicator
            let dotsCircle = new St.Bin({ visible: true, reactive: true, can_focus: true, track_hover: true, style_class: "dotspaces-dot" });

            // Create and set the label
            dotsCircle.label = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
            dotsCircle.set_child(dotsCircle.label);

            // Set text and connect input as necessary
            if (this.active_workspace_index === i) {
                dotsCircle.label.style_class = "dotspaces-active";
                dotsCircle.label.set_text(' ● ');
            } else {
                dotsCircle.label.set_text(' ○ ');
                dotsCircle.connect('button-release-event', () => this._change_workspace(i));
            }

            // Add actor
            this.dotsBox.add_actor(dotsCircle);
        }
    }

    _change_workspace(index) {
        global.workspace_manager.get_workspace_by_index(index).activate(global.get_current_time());
    }

    _onScroll(actor, event) {
        // Get the next index
        let index = this.active_workspace_index;
        switch (event.get_scroll_direction()) {
            case Clutter.ScrollDirection.UP: index--; break;
            case Clutter.ScrollDirection.DOWN: index++; break;
        }

        // Modulo division to wrap the workspace index
        index %= this.workspace_count;
        if (index < 0) index += this.workspace_count;

        // Change the workspace
        if (index >= 0 && index < this.workspace_count) this._change_workspace(index);
    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._dotspaces = new Dotspaces();

        // Add the workspaces to just after the activities button
        Main.panel.addToStatusArea(this._uuid, this._dotspaces, 1, 'left');
    }

    disable() {
        this._dotspaces._destroy();
        this._dotspaces = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
