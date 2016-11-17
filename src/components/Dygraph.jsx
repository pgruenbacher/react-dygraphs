import React from 'react';
import DygraphBase from 'dygraphs-commonjs';
import {propTypes as dygraphPropTypes, spreadProps as spreadKnownProps} from './Dygraph/options';
import {scrollV3 as scrollZoom} from './scrollZoom';

import {willDrawChart} from './custom';
// console.log('PLUGINS', DygraphBase.PLUGINS);
DygraphBase.PLUGINS.forEach(plugin=>{
  // console.log('plugin', plugin.prototype.toString());
  const name = plugin.prototype.toString();
  if (name === 'Axes Plugin') {
    plugin.prototype.willDrawChart = willDrawChart
  }
})


import {
  startZoom,
  drawZoomRect_,
  moveZoom,
  doZoom_,
  endZoom
} from './drawBox';


const oldStartZoom = DygraphBase.startZoom
const oldDrawZoomRect_ = DygraphBase.prototype.drawZoomRect_;
const oldMoveZoom = DygraphBase.moveZoom;
const oldDoZoom_ = DygraphBase.prototype.doZoom_;
const oldEndZoom = DygraphBase.endZoom

DygraphBase.prototype.cascadeDataDidUpdateEvent_ = function() {
    // TODO(danvk): there are some issues checking xAxisRange() and using
    // toDomCoords from handlers of this event. The visible range should be set
    // when the chart is drawn, not derived from the data.
    // console.log('this.handleDataDidUpdate?', this.handleDataDidUpdate)
    if (this.handleDataDidUpdate) this.handleDataDidUpdate(this);
    this.cascadeEvents_('dataDidUpdate', {});
};

class InteractionModelProxy {
    constructor() {
        for (const method of ['mousedown', 'touchstart', 'touchmove', 'touchend', 'dblclick']) {
            const thisProxy = this;
            this[method] = function (...args) {
                const calledContext = this;
                return thisProxy._target[method].call(calledContext, ...args);
            };
        }

        this['mousewheel'] = function (...args) {
            return scrollZoom(...args);
        };

        ['willDestroyContextMyself'].forEach(prop => {
            Object.defineProperty(this, prop, {
                configurable: false,
                enumerable: true,
                get: () => this._target[prop],
                set: value => this._target[prop] = value
            });
        });
    }

    _target = DygraphBase.Interaction.defaultModel;
}

// DygraphBase.startZoom = startZoom;
// DygraphBase.prototype.drawZoomRect_ = drawZoomRect_;
// DygraphBase.moveZoom = moveZoom;
// DygraphBase.prototype.doZoom_ = doZoom_;
// DygraphBase.endZoom = endZoom;

export default class Dygraph extends React.Component {

    static propTypes = Object.assign({
      style: React.PropTypes.object,
      onDataUpdate: React.PropTypes.func,
      rectangularZoom: React.PropTypes.bool
    }, dygraphPropTypes);

    static displayName = 'Dygraph';


    constructor(props) {
        super(props);
        this._handleDataDidUpdate = this._handleDataDidUpdate.bind(this);
    }

    componentDidMount() {
        const {known: initAttrs} = spreadKnownProps(this.props, true);
        this._interactionProxy._target =
            initAttrs.interactionModel || DygraphBase.Interaction.defaultModel;
        initAttrs.interactionModel = this._interactionProxy;

        this._dygraph = new DygraphBase(this.refs.root, this.props.data, initAttrs);
        // console.log('this._dygraph', this._dygraph);
        this._dygraph.handleDataDidUpdate = this._handleDataDidUpdate;
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.rectangularZoom !== this.props.rectangularZoom) {
        // console.log('rectangularZoom updated');
        if (nextProps.rectangularZoom) {
          DygraphBase.startZoom = startZoom;
          DygraphBase.prototype.drawZoomRect_ = drawZoomRect_;
          DygraphBase.moveZoom = moveZoom;
          DygraphBase.prototype.doZoom_ = doZoom_;
          DygraphBase.endZoom = endZoom;
        } else {
          DygraphBase.startZoom = oldStartZoom;
          DygraphBase.prototype.drawZoomRect_ = oldDrawZoomRect_;
          DygraphBase.moveZoom = oldMoveZoom;
          DygraphBase.prototype.doZoom_ = oldDoZoom_;
          DygraphBase.endZoom = oldEndZoom;
        }
      }
    }


    componentWillUpdate(nextProps/*, nextState*/) {
        if (this._dygraph) {
            let {known: updateAttrs} = spreadKnownProps(nextProps, false);
            this._interactionProxy._target =
                updateAttrs.interactionModel || DygraphBase.Interaction.defaultModel;
            updateAttrs.interactionModel = this._interactionProxy;
            // console.log('')
            if (typeof updateAttrs.file === 'string') {

                if (this.props.data === updateAttrs.file) {
                    delete updateAttrs.file;
                    // let {file, ...updateAttrs} = updateAttrs;
                }
            }
            this._dygraph.updateOptions(updateAttrs);
        }
    }

    componentWillUnmount() {
        if (this._dygraph) {
            this._dygraph.destroy();
            this._dygraph = null;
        }
    }

    _handleDataDidUpdate(dygraph) {
        if (this.props.onDataUpdate) {
            this.props.onDataUpdate(dygraph)
        }
    }

    reloadFile() {
        let {known: updateAttrs} = spreadKnownProps(this.props, false);
        this._interactionProxy._target =
                updateAttrs.interactionModel || DygraphBase.Interaction.defaultModel;
        updateAttrs.interactionModel = this._interactionProxy;
        this._dygraph.updateOptions(updateAttrs);
    }

    _interactionProxy = new InteractionModelProxy();

    render() {
        return (
            <div
                id='dygraph-mount'
                ref='root'
                style={this.props.style}
            />
        );
    }
}


// function areEqualShallow(a, b, list = []) {
//     for(let key in a) {
//         if(!(key in b) || a[key] !== b[key]) {
//             if (list.indexOf(key) > -1) {
//                 continue
//             }
//             console.log('!', key)
//             return false;
//         }
//     }
//     for(let key in b) {
//         if(!(key in a) || a[key] !== b[key]) {
//             if (list.indexOf(key) > -1) {
//                 continue
//             }
//             console.log('!', key)
//             return false;
//         }
//     }
//     return true;
// }
