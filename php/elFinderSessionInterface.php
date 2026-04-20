<?php

/**
 * elFinder - file manager for web.
 * Session Wrapper Interface.
 *
 * @package elfinder
 * @author  Naoki Sawada
 **/

interface elFinderSessionInterface
{
    /**
     * Session start
     *
     * @return  self
     **/
    public function start();

    /**
     * Session write & close
     *
     * @return  self
     **/
    public function close();

    /**
     * Get session data
     * This method must be equipped with an automatic start / close.
     *
     * @param   string $key   Target key
     * @param   mixed  $empty Return value of if session target key does not exist
     *                 and explicit $empty can be used as a type hint
     *
     * @return  mixed
     **/
    public function get($key, $empty = null);

    /**
     * Set session data
     * This method must be equipped with an automatic start / close.
     *
     * @param   string $key  Target key
     * @param   mixed  $data Value
     *
     * @return  self
     **/
    public function set($key, $data);

    /**
     * Get session data
     *
     * @param   string $key Target key
     *
     * @return  self
     **/
    public function remove($key);
}
