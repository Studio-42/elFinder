<?php

/**
 * Abstract class of editor plugins.
 *
 * @author Naoki Sawada
 */
class elFinderEditor
{
    /**
     * Array of allowed method by request from client side.
     *
     * @var array
     */
    protected $allowed = array();

    /**
     * elFinder instance
     *
     * @var object elFinder instance
     */
    protected $elfinder;

    /**
     * Arguments
     *
     * @var array argValues
     */
    protected $args;

    /**
     * Constructor.
     *
     * @param object $elfinder
     * @param array  $args
     */
    public function __construct($elfinder, $args)
    {
        $this->elfinder = $elfinder;
        $this->args = $args;
    }

    /**
     * Return boolean that this plugin is enabled.
     *
     * @return bool
     */
    public function enabled()
    {
        return true;
    }

    /**
     * Return boolean that $name method is allowed.
     *
     * @param string $name
     *
     * @return bool
     */
    public function isAllowedMethod($name)
    {
        $checker = array_flip($this->allowed);

        return isset($checker[$name]);
    }

    /**
     * Return $this->args value of the key
     *
     * @param      string $key   target key
     * @param      string $empty empty value
     *
     * @return     mixed
     */
    public function argValue($key, $empty = '')
    {
        return isset($this->args[$key]) ? $this->args[$key] : $empty;
    }
}
