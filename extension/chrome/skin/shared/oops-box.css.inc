%if 0
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
%endif

#htitle-overlay-box {
  -moz-appearance: none;
  background: rgba(50, 50, 50, 0.7) !important;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  top: 0;
  visibility: hidden;
  width: 100%;
  z-index: 1000;
}

#htitle-message-box {
  background: rgba(50, 50, 50, 0.9);
  pointer-events: all;
  position: fixed;
  left: calc(50% - 550px/2);
  top: calc(50% - 180px/2);
}

#htitle-message-box,
#htitle-message-box > vbox {
  height: 180px;
  width: 550px;
}

#htitle-message-box > vbox {
  -moz-box-pack: center;
  padding: 20px;
}

#htitle-message-title {
  color: #fff;
  font-size: 32pt;
}

.htitle-message-desc {
  color: #fff;
  font-size: 12pt;
  margin-top: 10px;
  -moz-margin-start: 10px;
}

.htitle-message-button {
  -moz-appearance: none;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0;
  color: #fff;
  height: 25px;
  margin: 15px 10px 0 350px;
  width: 20px;
}
