var { Scroller } = require('scroller');

var Scrollable = function(props) {
  return {
    getDefaultProps() {
      return Object.assign({}, {
        scrollBounce: true,
        scrollX: false,
        scrollY: false,
        scrollSnap: false
      }, props);
    },

    getInitialState() {
      return {
        scrollX: 0,
        scrollY: 0,
        scrollOff: false
      };
    },

    componentWillMount() {
      this.scroller = this.props.scroller || new Scroller(this._handleScroll, {
        bouncing: this.props.scrollBounce,
        scrollingX: this.props.scrollX,
        scrollingY: this.props.scrollY,
        snapping: this.props.scrollSnap
      });
    },

    componentDidMount() {
      this._measureScroll();
      window.addEventListener('resize', this._measureScroll);
    },

    componentWillUnmount() {
      window.removeEventListener('resize', this._measureScroll);
    },

    _measureScroll() {
      var node = this.getDOMNode();
      var content = this.refs.content;
      var contentWidth, contentHeight;

      if (content) {
        content = content.getDOMNode();
        contentWidth = content.clientWidth;
        contentHeight = content.clientHeight;
      }

      this.scroller.setDimensions(
        node.clientWidth,
        node.clientHeight,
        (this.props.contentWidth || contentWidth || node.clientWidth) +
          (this.props.sideWidth || 0),
        this.props.contentHeight || contentHeight || node.clientHeight +
          (this.props.topWidth || 0)
      );

      if (this.afterMeasureScroll)
        this.afterMeasureScroll(node);
      else {
        if (this.props.scrollSnap)
          this.scroller.setSnapSize(node.clientWidth, node.clientHeight);

        this.scroller.scrollTo(node.clientWidth, 0);
      }
    },

    _handleScroll(x, y) {
      this.setState({
        scrollX: x,
        scrollY: y
      });
    }
  };
};

module.exports = Scrollable;