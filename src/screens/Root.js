import React, { Component, Fragment } from 'react';
import { View } from 'react-native';
import StyleKit from "@Style/StyleKit"
import Sync from '@SFJS/syncManager'
import Auth from '@SFJS/authManager'
import KeysManager from '@Lib/keysManager'

import Abstract from "@Screens/Abstract"
import LockedView from "@Containers/LockedView";
import ApplicationState from "@Lib/ApplicationState"

import Compose from "@Screens/Compose"
import Notes from "@Screens/Notes/Notes"

export default class Root extends Abstract {

  constructor(props) {
    super(props);
    this.registerObservers();
  }

  registerObservers() {
    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      let authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
      if(authProps.sources.length > 0) {
        this.presentAuthenticationModal(authProps);
      }
      else if(state == ApplicationState.GainingFocus) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if(this.dataLoaded) {
          Sync.get().sync();
        }
      }
    })

    this.syncStatusObserver = Sync.get().registerSyncStatusObserver((status) => {
      if(status.error) {
        var text = `Unable to connect to sync server.`
        this.showingErrorStatus = true;
        setTimeout( () => {
          // need timeout for syncing on app launch
          this.setStatusBarText(text);
        }, 250);
      } else if(status.retrievedCount > 20) {
        var text = `Downloading ${status.retrievedCount} items. Keep app opened.`
        this.setStatusBarText(text);
        this.showingDownloadStatus = true;
      } else if(this.showingDownloadStatus) {
        this.showingDownloadStatus = false;
        var text = "Download Complete.";
        this.setStatusBarText(text);
        setTimeout(() => {
          this.setStatusBarText(null);
        }, 2000);
      } else if(this.showingErrorStatus) {
        this.setStatusBarText(null);
      }
    })

    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        this.setStatusBarText(null);
      }
    });
  }

  componentDidMount() {
    super.componentDidMount();
    if(this.authOnMount) {
      // Perform in timeout to avoid stutter when presenting modal on initial app start.
      setTimeout(() => {
        this.presentAuthenticationModal(this.authOnMount);
        this.authOnMount = null;
      }, 20);
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
    Sync.get().removeSyncStatusObserver(this.syncStatusObserver);
    clearInterval(this.syncTimer);
  }

  /* Forward React Navigation lifecycle events to notes */

  componentWillFocus() {
    super.componentWillFocus();
    this.notesRef && this.notesRef.componentWillFocus();
  }

  componentDidFocus() {
    super.componentDidFocus();
    this.notesRef && this.notesRef.componentDidFocus();
  }

  componentDidBlur() {
    super.componentDidBlur();
    this.notesRef && this.notesRef.componentDidBlur();
  }

  componentWillBlur() {
    super.componentWillBlur();
    this.notesRef && this.notesRef.componentWillBlur();
  }

  loadInitialState() {
    this.initializeData();
    this.beginSyncTimer();
    super.loadInitialState();
  }

  beginSyncTimer() {
    // Refresh every 30s
    this.syncTimer = setInterval(function () {
      Sync.get().sync(null);
    }, 30000);
  }

  initializeData() {
    let encryptionEnabled = KeysManager.get().isOfflineEncryptionEnabled();
    this.setStatusBarText(encryptionEnabled ? "Decrypting items..." : "Loading items...");
    let incrementalCallback = (current, total) => {
      let notesString = `${current}/${total} items...`
      this.setStatusBarText(encryptionEnabled ? `Decrypting ${notesString}` : `Loading ${notesString}`);
      // Incremental Callback
      if(!this.dataLoaded) {
        this.dataLoaded = true;
      }
      this.notesRef.root_onIncrementalSync();
    }

    let loadLocalCompletion = (items) => {
      this.setStatusBarText("Syncing...");
      this.dataLoaded = true;
      // perform initial sync
      Sync.get().sync().then(() => {
        this.setStatusBarText(null);
      });
    }

    if(Sync.get().initialDataLoaded()) {
      // Data can be already loaded in the case of a theme change
      loadLocalCompletion();
    } else {
      let batchSize = 100;
      Sync.get().loadLocalItems(incrementalCallback, batchSize).then((items) => {
        setTimeout(() => {
          loadLocalCompletion(items);
        });
      });
    }
  }

  presentAuthenticationModal(authProps) {
    if(!this.isMounted()) {
      console.log("Not yet mounted, not authing.");
      this.authOnMount = authProps;
      return;
    }


    if(this.authenticationInProgress) {
      console.log('Not presenting auth modal because one is already presented.');
      return;
    }

    this.authenticationInProgress = true;

    this.props.navigation.navigate("Authenticate", {
      authenticationSources: authProps.sources,
      onSuccess: () => {
        authProps.onAuthenticate();
        this.authenticationInProgress = false;

        if(this.dataLoaded) {
          Sync.get().sync();
        }
      }
    });
  }

  setStatusBarText(text) {
    this.setSubTitle(text);
  }

  onNoteSelect = (note) => {
    this.composer.setNote(note);
    this.setState({selectedTagId: this.notesRef.options.selectedTagIds.length && this.notesRef.options.selectedTagIds[0]});
  }

  render() {
    /* Don't render LockedView here since we need this.notesRef as soon as we can (for componentWillFocus callback) */

    let isTablet = ApplicationState.get().isTablet;

    return (
      <View style={[StyleKit.styles.container, this.styles.root]}>
        {!isTablet &&
          <Notes
            ref={(ref) => {this.notesRef = ref}}
            navigation={this.props.navigation}
          />
        }

        {isTablet &&
          <Fragment>
            <View style={this.styles.left}>
              <Notes
                ref={(ref) => {this.notesRef = ref}}
                navigation={this.props.navigation}
                onNoteSelect={this.onNoteSelect}
              />
            </View>

            <View style={this.styles.right}>
              <Compose
                ref={(ref) => {this.composer = ref}}
                selectedTagId={this.state.selectedTagId}
                navigation={this.props.navigation}
              />
            </View>
          </Fragment>
        }

      </View>
    )
  }

  loadStyles() {
    this.styles = {
      root: {
        flex: 1,
        flexDirection: "row"
      },
      left: {
        width: "34%",
        borderRightColor: StyleKit.variables.stylekitBorderColor,
        borderRightWidth: 1
      },
      right: {
        width: "66%"
      }
    }
  }

}