var React = require('react/addons');
var { Scroller } = require('reapp-scroller');
var DocumentTitle = require('react-document-title');
var Component = require('../component');
var TitleBar = require('../components/TitleBar');
var TouchableArea = require('../helpers/TouchableArea');
var clone = require('../lib/niceClone');
var ScrollDriver = require('./ScrollDriver');

var Transitionable = require('famous/core/Transitionable');
var Modifier = require('famous/core/Modifier');
var GenericSync = require('famous/inputs/GenericSync');

GenericSync.register({
  "touch": TouchSync,
  "scroll": ScrollSync,
  "mouse": MouseSync
});

// ViewLists are the most complex piece of the UI kit.
// Their usage is simple, but they manage a lot of state,
// encompass many animations, and also need to know about multiple
// child components (see TitleBar, View, Icon)

module.exports = {
  propTypes: {
    scrollToStep: React.PropTypes.number,
    disableScroll: React.PropTypes.bool,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    onTouchStart: React.PropTypes.func,
    onTouchEnd: React.PropTypes.func,
    onViewEntering: React.PropTypes.func,
    onViewEntered: React.PropTypes.func,
    onViewLeaving: React.PropTypes.func,
    onViewLeft: React.PropTypes.func,
    scrollerProps: React.PropTypes.object
  },

  getViewListInitialState() {
    return {
      // We put children in state, so when a parent removes a view
      // we can animate backwards, and then remove them from state
      children: this.props.children,
      width: this.props.width,
      height: this.props.height,
      step: this.props.scrollToStep || 0
    };
  },

  componentWillMount() {
    this.setAnimationState('viewList');

    this.positionX = new Transitionable(0);
    this.positionY = new Transitionable(0);
    this._scrollModifier = new Modifier();

    this._particle = new Particle();
    this._physicsEngine = new PhysicsEngine();
    this._physicsEngine.addBody(this._particle);
    this._scrollHandler = new EventHandler();

    var ScrollDriver = SimpleDriver;
    this._driver = new ScrollDriver({
      scrollView: this,
      physicsEngine: this._physicsEngine,
      particle: this._particle,
      direction: this.direction
    });
  },

  _bindScrollEvents: function() {
    var events = ['touchstart', 'touchmove', 'touchend'];

    events.forEach(type => {
      this.refs.inner.getDOMNode().on(type, (e) => {
        this._scrollType = type;
        this._scrollHandler.emit(type, e.originalEvent);
      });
    });

    this.sync = new GenericSync({
      "scroll": {},
      "touch": {}
    });

    this.sync.on('start', this._onScrollStart);
    this.sync.on('update', this._onScrollUpdate);
    this.sync.on('end', this._onScrollEnd);

    this._scrollHandler.pipe(this.sync);
  },

  _onScrollStart() {

  },

  _onScrollEnd() {

  },

  _onScrollUpdate: function(data) {
    // if you were animating a scroll, this will kill it
    this.clearScrollAnimations();

    var delta = data.delta;
    this._previousScrollUpdate = data;

    // cache the direction for all future movement until you start again
    this._setScrollDirection(delta);

    // depending on the direction you are scrolling, this will normalize the data
    // setting the other direction to 0, stopping any scroll in that direction
    delta = utils.normalizeVector(delta, this.direction);

    // dampen the delta so it feels right between mobile and desktop
    delta = this._driver.dampenDelta(data.delta, this._scrollType);

    // run calculations based on variables, spit back needed data
    var boundsInfo = this.getBoundsInfo(delta);


    // stop scrolling if size doesn't warrent it
    var shouldScroll =  this._shouldScroll(boundsInfo.contentSize, boundsInfo.containerSize);
    if(!shouldScroll)return;


    // we check with the driver to see if it wants to limit the position of the
    // scroll when we are updating via scroll
    this.setScrollPosition(boundsInfo.gotoPosX, boundsInfo.gotoPosY, null, this._driver.shouldLimitPastBounds());

    // give the driver an opportunity to take control of the particle
    // add a bounce for example
    this._driver.updateParticle(boundsInfo.isPastLimits, boundsInfo.anchorPoint, data.velocity);


    // trigger event handler
    this._updateScrollVelocity();
  },


  getBoundsInfo: function(delta){
      var gotoPosX = this.positionX.get() + delta[0];
      var gotoPosY = this.positionY.get() + delta[1];
      var contentSize = this.getContentSize();
      var containerSize = this.getSize();
      var scrollableDistanceX = contentSize[0] - containerSize[0];
      var scrollableDistanceY = contentSize[1] - containerSize[1];

      var isPastTop = gotoPosY >= 0;
      var isPastBottom = scrollableDistanceY + gotoPosY <= 0;
      var isPastLeft = gotoPosX >= 0;
      var isPastRight = scrollableDistanceX + gotoPosX <= 0;

      var isOutOfBoundsY = isPastTop || isPastBottom;
      var isOutOfBoundsX = isPastLeft || isPastRight;

      var anchorPoint = [gotoPosX, gotoPosY, 0];
      var isPastLimits = false;

      var outOfBoundsX = gotoPosX;
      var outofBoundsY = gotoPosY;
      if(isOutOfBoundsX && this.direction != DIRECTION_Y){
          outOfBoundsX = isPastRight ? -scrollableDistanceX : 0;
          anchorPoint[0] = outOfBoundsX;
          isPastLimits = true;
      }
      if(isOutOfBoundsY && this.direction != DIRECTION_X){
          outofBoundsY = isPastBottom ? -scrollableDistanceY : 0;
          anchorPoint[1] = outofBoundsY;
          isPastLimits = true;
      }

      return {
          gotoPosX: gotoPosX,
          gotoPosY: gotoPosY,
          isPastLimits: isPastLimits,
          anchorPoint: anchorPoint,
          contentSize: contentSize,
          containerSize: containerSize
      };
  },

  _shouldScroll: function(contentSize, containerSize) {
      if (this.direction == DIRECTION_X) {
          if (contentSize[0] > containerSize[0]) return true;
      } else if (this.direction == DIRECTION_Y) {
          if (contentSize[1] > containerSize[1]) return true;
      } else {
          // need more testing around this
          return true;
      }
      return false;
  },


  _updateScrollVelocity: function(){

      currTickTime = new Date().getTime();
      currTickPos = this.getScrollPosition();
      if(this._prevTickPos && this._prevTickTime){
          var tickDiff =  currTickTime - this._prevTickTime;
          this._currentVelocity = this._getVelocityForPositions(this._prevTickPos, currTickPos, tickDiff);
      }
      this._prevTickPos = currTickPos;
      this._prevTickTime = currTickTime;
  },

  componentDidMount() {
    this.scroller = new Scroller(this.handleScroll, this.props.scrollerProps);
    this.setupDimensions();
    this.setScrollPosition();
    this.setupViewList(this.props);
    this.runViewCallbacks(this.state.step);
    window.addEventListener('resize', this.resize);
    this.didMount = true;
  },

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  },

  componentWillReceiveProps(nextProps) {
    if (this.props.disableScroll !== nextProps.disableScroll) {
      if (nextProps.disableScroll)
        return this.disableAnimation();
      else
        this.enableAnimation();
    }

    if (this._isAnimating || !this.didMount)
      return;

    // new scrollToStep
    if (nextProps.scrollToStep !== this.props.scrollToStep) {
      var isAdvancing = nextProps.scrollToStep >= this.state.step;
      if (isAdvancing) {
        this.setupViewList(nextProps);
        this.scrollToStep(nextProps.scrollToStep);
      }
      else
        this.scrollToStep(nextProps.scrollToStep, () => {
          this.setupViewList(nextProps);
        });
    }
    // else no new scroll position
    else {
      // todo: this gets called too much
      this.setupViewList(nextProps);
    }
  },

  // todo: this shouldn't need to do so much here
  // for now this fixes a bug where if you start with a step > 0
  setScrollPosition() {
    var step = this.state.step;

    // setTimeout because we are fighting Scroller
    setTimeout(() => {
      this.scroller.setPosition(step * this.state.width, 0);
      this.scroller.scrollTo(step * this.state.width, 0, false);
      this.setState({ step  });
    });
  },

  animationContext() {
    return {
      width: this.state.width
    };
  },

  // allow custom title bar heights
  getTitleBarHeight() {
    return this.props.titleBarProps.height || this.getConstant('titleBarHeight');
  },

  setupViewList(props) {
    var { width, height, children } = props;
    this.setupViewEnterStates(children);

    if (!children || !children.length)
      return;

    children = children.filter(child => !!child);

    this.scroller.setSnapSize(width, height);
    this.scroller.setDimensions(width, height, width * children.length, height);

    if (this.isMounted())
      this.setState({ children });
  },

  // scrolls the viewList to a given step
  scrollToStep(step, cb) {
    if (step !== this.state.step) {
      this._isAnimating = true;
      this.scroller.scrollTo(this.state.width * step, 0, true);

      this.onViewEntered = () => {
        this.onViewEntered = null;
        this._isAnimating = false;
        if (cb) cb();
      };
    }
  },

  setupDimensions() {
    if (this.props.resizeWithWindow)
      this.setState({
        width: window.innerWidth,
        height: window.innerHeight
      });
  },

  resize() {
    this.setupDimensions();
    this.setScrollPosition();
  },

  setupViewEnterStates(children) {
    if (!children || !children.length)
      this.visibleViews = [];
    else {
      this.visibleViews = new Array(children.length - 1);
      this.visibleViews[0] = true;
    }
  },

  disableInitialScrollEvent: true,

  // this is called back from Scroller, each time the user scrolls
  handleScroll(left) {
    // this is a hack, but the Scroller lib fires a scroll event that
    // results in not respecting the props.scrollToStep on mount
    // .... we need to improve the Scroller lib
    if (this.disableInitialScrollEvent) {
      this.disableInitialScrollEvent = false;
      return;
    }

    // disabled || only one view
    if (this.props.disableScroll ||
        this.state.children.length === 1 && this.state.step === 0)
      return;

    var step = this.state.width ? left / this.state.width : 0;

    if (step !== this.state.step) {
      this.setState({ step });
    }
  },

  componentDidUpdate(_, prevState) {
    if (prevState.step !== this.state.step) {
      this.runViewCallbacks(this.state.step);
    }
  },

  runViewCallbacks(step) {
    if (step % 1 !== 0) {
      if (!this._hasCalledEnteringLeaving) {
        var entering, leaving;
        var floor = Math.floor(step);
        var ceil = Math.ceil(step);

        // if sliding forwards
        if (this.visibleViews[floor]) {
          entering = ceil;
          leaving = floor;
        }
        else {
          entering = floor;
          leaving = ceil;
        }

        this.visibleViews[entering] = true;
        this.callProperty('onViewEntering', entering);
        this.callProperty('onViewLeaving', leaving);
        this._hasCalledEnteringLeaving = true;
      }
    }
    else {
      // set this to false to reset entering/leaving callbacks for next drag
      this._hasCalledEnteringLeaving = false;

      this.callProperty('onViewEntered', step);

      var prev = step-1;
      var next = step+1;

      if (this.visibleViews[prev]) {
        this.callProperty('onViewLeft', prev);
        this.visibleViews[prev] = false;
      }
      else if (this.visibleViews[next]) {
        this.callProperty('onViewLeft', next);
        this.visibleViews[next] = false;
      }
    }
  },

  callProperty(name, ...args) {
    setTimeout(() => {
      // apply to viewlist first
      if (this[name])
        this[name].apply(this, args);

      // then call any external
      if (this.props[name])
        this.props[name].apply(this, args);
    }, 10);
  },

  isOnStage(index) {
    return (
      (index >= this.state.step - 1) &&
      (index <= this.state.step + 1)
    );
  },

  handleTouchStart(e) {
    if (this.props.onTouchStart)
      this.props.onTouchStart(e);
  },

  handleTouchEnd(e) {
    if (this.props.onTouchEnd)
      this.props.onTouchEnd(e);
  },

  getTitleBarProps() {
    return this.props.noFakeTitleBar ?
      this.props.titleBarProps :
      Object.assign({ transparent: true }, this.props.titleBarProps);
  },

  getViewAnimations(view) {
    return view && view.props.animations ?
      Object.assign(this.props.viewAnimations, view.props.animations) :
      this.props.viewAnimations;
  },

  getTouchableAreaProps() {
    return this.props.disableScroll ?
      {
        untouchable: true
      } :
      Object.assign({
        ignoreY: true,
        scroller: this.scroller
      },
      this.props.touchableAreaProps,
      {
        touchStartBoundsX: this.props.touchStartBoundsX,
        touchStartBoundsY: this.getTouchStartBoundsY(),
        onTouchStart: this.handleTouchStart,
        onTouchEnd: this.handleTouchEnd,
        untouchable: (
          this.props.touchableAreaProps && this.props.touchableAreaProps.untouchable ||
          this.props.disableScroll
        )
      });
  },

  getTouchStartBoundsY() {
    return this.props.touchStartBoundsY || {
      from: this.getTitleBarHeight(),
      to: this.props.height
    };
  },

  getViewList(props) {
    var { touchableProps, viewProps } = props || {};

    var touchableAreaProps = this.getTouchableAreaProps();
    var activeTitle;

    this.setAnimationState('viewList');

    return (
      <TouchableArea {...touchableAreaProps} {...touchableProps}>
        {!this.props.noFakeTitleBar && (
          <TitleBar {...this.props.titleBarProps} animations={{}} />
        )}

        {clone(this.state.children, (child, i) => {
          if (i === this.state.step)
            activeTitle = child.props && child.props.title;

          return Object.assign({
            key: i,
            index: i,
            inactive: i !== this.state.step,
            animationState: {
              viewList: { index: i }
            },
            titleBarProps: this.getTitleBarProps(),
            animations: this.getViewAnimations(child),
            width: this.state.width,
            height: this.state.height,
            viewListScrollToStep: this.scrollToStep
          }, viewProps);
        }, true)}

        {activeTitle &&
          <DocumentTitle title={Array.isArray(activeTitle) ?
            activeTitle[1] :
            activeTitle} />}
      </TouchableArea>
    );
  }
};